/**
 * Invoice controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
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
  const body = { ...req.body };
  if (body.customerId === '' || body.customerId == null) body.customerId = undefined;
  delete body.invoiceSeq;
  delete body.number;
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
