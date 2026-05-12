/**
 * Invoice controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
const Inventory = require('../models/Inventory');
const InvoiceCounter = require('../models/InvoiceCounter');
const Tenant = require('../models/Tenant');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { formatInvoiceNumber, maxInvoiceSeqFromNumbers } = require('../utils/invoiceNumber');
const { streamInvoicePdf } = require('../utils/invoicePdf');

function assertMongoObjectId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
}

async function assertCustomerHasBillableWorkOrderItems(tenantId, customerId) {
  if (!customerId || !mongoose.isValidObjectId(String(customerId))) {
    throw new ApiError(400, 'Customer is required');
  }
  const cid = new mongoose.Types.ObjectId(String(customerId));
  const wos = await WorkOrder.find({ tenantId, customerId: cid }).select('items').lean();
  for (const wo of wos) {
    for (const it of wo.items || []) {
      const q = Number(it.quantity) || 0;
      if (q <= 0) continue;
      if (String(it.name || '').trim()) return;
      if (it.inventoryId != null && mongoose.isValidObjectId(String(it.inventoryId))) return;
    }
  }
  throw new ApiError(
    400,
    'Add at least one line item on a work order for this customer before creating an invoice.'
  );
}

/** When an invoice line description exactly matches an inventory item name (case-insensitive), quantities cannot exceed on-hand stock. */
async function assertInvoiceLinesWithinInventoryStock(tenantId, lineItems) {
  const items = await Inventory.find({ tenantId }).select('name quantity sku').lean();
  const byLowerName = new Map();
  for (const inv of items) {
    const k = String(inv.name || '').trim().toLowerCase();
    if (!k) continue;
    byLowerName.set(k, {
      quantity: Number(inv.quantity) || 0,
      label: String(inv.name || inv.sku || k).trim() || k,
    });
  }
  const requested = new Map();
  for (const li of lineItems || []) {
    const desc = String(li.description || '').trim();
    if (!desc) continue;
    const k = desc.toLowerCase();
    if (!byLowerName.has(k)) continue;
    const q = Number(li.quantity) || 0;
    if (q <= 0) continue;
    requested.set(k, (requested.get(k) || 0) + q);
  }
  for (const [k, want] of requested) {
    const inv = byLowerName.get(k);
    if (want > inv.quantity) {
      throw new ApiError(
        400,
        `Invoiced quantity for "${inv.label}" (${want}) exceeds available stock (${inv.quantity}).`
      );
    }
  }
}

function isDueDateInThePast(dueVal) {
  if (!dueVal) return false;
  const d = new Date(dueVal);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return Date.now() > end.getTime();
}

function lineItemRowTotal(r) {
  if (r.amount != null && Number.isFinite(Number(r.amount))) return Number(r.amount);
  return (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
}

/** Recompute subtotal, discount amount, and total from line items + % discount + fixed tax. */
function normalizeInvoiceTotals(body) {
  const items = Array.isArray(body.lineItems) ? body.lineItems : [];
  const subtotal = Math.round(items.reduce((s, r) => s + lineItemRowTotal(r), 0) * 100) / 100;
  const discPct = Math.min(100, Math.max(0, Number(body.discountPercent) || 0));
  const rawDiscount = discPct > 0 ? Math.round(((subtotal * discPct) / 100) * 100) / 100 : 0;
  const discountAmount = Math.min(subtotal, rawDiscount);
  const tax = Math.max(0, Number(body.tax) || 0);
  const total = Math.round((subtotal - discountAmount + tax) * 100) / 100;
  return {
    ...body,
    subtotal,
    discountPercent: discPct,
    discountAmount,
    tax,
    total,
  };
}

async function syncInvoiceCounterFromDb(tenantId) {
  const docs = await Invoice.find({ tenantId }).select('number').lean();
  const maxFromNumbers = maxInvoiceSeqFromNumbers(docs.map((d) => d.number));
  const existing = await InvoiceCounter.findOne({ tenantId }).lean();
  const seq = existing?.seq || 0;
  const target = Math.max(seq, maxFromNumbers);
  const updated = await InvoiceCounter.findOneAndUpdate(
    { tenantId },
    { $set: { seq: target } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const { createdFrom, createdTo } = req.query;
  if (createdFrom || createdTo) {
    const range = {};
    if (createdFrom) {
      const from = new Date(createdFrom);
      if (!Number.isNaN(from.getTime())) range.$gte = from;
    }
    if (createdTo) {
      const to = new Date(createdTo);
      if (!Number.isNaN(to.getTime())) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
    }
    if (Object.keys(range).length) filter.createdAt = range;
  }
  const items = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: 'customerId', select: 'name email' })
    .lean();
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  /** Express 5 can still match GET /invoices/next-number as /:id → avoid CastError. */
  if (id === 'next-number') {
    const seq = await syncInvoiceCounterFromDb(req.tenantId);
    return res.json({ success: true, data: { number: formatInvoiceNumber(seq + 1) } });
  }
  assertMongoObjectId(id, 'invoice id');
  const doc = await Invoice.findOne({ _id: id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, data: doc });
});

/** PDF download — prefer GET /billing/download-invoice/:id; /invoices/pdf/:id kept as alias. */
exports.downloadPdf = asyncHandler(async (req, res) => {
  assertMongoObjectId(req.params.id, 'invoice id');
  const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate({ path: 'customerId', select: 'name email phone address billingAddress' })
    .populate({ path: 'workOrderId', select: 'title workOrderNumber' })
    .lean();
  if (!invoice) throw new ApiError(404, 'Invoice not found');

  const tenant = await Tenant.findById(req.tenantId).lean();
  if (!tenant) throw new ApiError(404, 'Organization not found');

  const customer =
    invoice.customerId && typeof invoice.customerId === 'object' ? invoice.customerId : null;

  const safeName = String(invoice.number || 'invoice').replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);

  streamInvoicePdf(res, { tenant, invoice, customer });
});

/** Next invoice number for forms (does not consume a number). */
exports.suggestNextNumber = asyncHandler(async (req, res) => {
  const seq = await syncInvoiceCounterFromDb(req.tenantId);
  res.json({ success: true, data: { number: formatInvoiceNumber(seq + 1) } });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  if (body.customerId === '' || body.customerId == null) delete body.customerId;
  delete body.invoiceSeq;
  delete body.number;

  if (body.customerId) {
    await assertCustomerHasBillableWorkOrderItems(req.tenantId, body.customerId);
  } else {
    throw new ApiError(400, 'Customer is required');
  }
  await assertInvoiceLinesWithinInventoryStock(req.tenantId, body.lineItems || []);

  await syncInvoiceCounterFromDb(req.tenantId);
  const counter = await InvoiceCounter.findOneAndUpdate(
    { tenantId: req.tenantId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  body.invoiceSeq = counter.seq;
  body.number = formatInvoiceNumber(counter.seq);

  const doc = await Invoice.create(normalizeInvoiceTotals(body));
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  assertMongoObjectId(req.params.id, 'invoice id');
  const existing = await Invoice.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!existing) throw new ApiError(404, 'Invoice not found');
  if (isDueDateInThePast(existing.dueDate)) {
    throw new ApiError(400, 'This invoice cannot be edited because its due date has passed.');
  }

  const body = { ...req.body };
  if (body.customerId === '' || body.customerId == null) body.customerId = undefined;
  delete body.invoiceSeq;
  delete body.number;
  if (body.customerId != null) {
    await assertCustomerHasBillableWorkOrderItems(req.tenantId, body.customerId);
  }
  if (!Array.isArray(body.lineItems)) {
    body.lineItems = existing.lineItems || [];
  }
  await assertInvoiceLinesWithinInventoryStock(req.tenantId, body.lineItems);

  const normalized = normalizeInvoiceTotals(body);
  const doc = await Invoice.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    normalized,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  assertMongoObjectId(req.params.id, 'invoice id');
  const result = await Invoice.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, message: 'Deleted' });
});
