/**
 * Reports: tenant-scoped aggregates from WorkOrder, Invoice, Customer, Inventory.
 */
const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendExcelWorkbook } = require('../utils/reportExcel');

const EXPORT_DATASETS = new Set([
  'work-orders-this-month',
  'revenue-this-month',
  'open-invoices',
  'work-orders-all',
  'customers',
  'inventory',
]);

function fmtIso(d) {
  if (d == null) return '';
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? '' : new Date(d).toISOString();
}

function tenantObjectId(tenantId) {
  if (tenantId == null || !mongoose.isValidObjectId(tenantId)) {
    throw new ApiError(403, 'Tenant context required');
  }
  return new mongoose.Types.ObjectId(String(tenantId));
}

function utcMonthBounds(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

/** Paid invoices counted toward “revenue this month” (same rules as dashboard export). */
function paidInMonthFilter(tenantId, start, end) {
  return {
    tenantId,
    status: 'paid',
    $or: [
      { paidAt: { $gte: start, $lt: end } },
      {
        $and: [
          { $or: [{ paidAt: null }, { paidAt: { $exists: false } }] },
          { updatedAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  };
}

exports.dashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  tenantObjectId(tenantId);
  const { start, end } = utcMonthBounds();

  const [
    workOrdersThisMonth,
    openInvoices,
    customersCount,
    inventoryCount,
    workOrdersTotal,
    paidInvoices,
  ] = await Promise.all([
    WorkOrder.countDocuments({ tenantId, createdAt: { $gte: start, $lt: end } }),
    Invoice.countDocuments({
      tenantId,
      status: { $in: ['draft', 'sent', 'overdue'] },
    }),
    Customer.countDocuments({ tenantId }),
    Inventory.countDocuments({ tenantId }),
    WorkOrder.countDocuments({ tenantId }),
    Invoice.find(paidInMonthFilter(tenantId, start, end)).select('total').lean(),
  ]);

  const revenueThisMonth = paidInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);

  res.json({
    success: true,
    data: {
      workOrdersThisMonth,
      revenueThisMonth,
      openInvoices,
      customersCount,
      inventoryCount,
      workOrdersTotal,
      monthStart: start.toISOString(),
      monthEnd: end.toISOString(),
    },
  });
});

exports.workOrderStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const tid = tenantObjectId(tenantId);
  const { from, to } = req.query;
  const match = { tenantId: tid };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const rows = await WorkOrder.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byStatus = rows.map((r) => ({ status: r._id || 'unknown', count: r.count }));
  const total = byStatus.reduce((s, r) => s + r.count, 0);

  res.json({ success: true, data: { byStatus, total } });
});

exports.exportExcel = asyncHandler(async (req, res) => {
  const { dataset } = req.params;
  if (!EXPORT_DATASETS.has(dataset)) {
    throw new ApiError(400, 'Unknown export');
  }
  const tenantId = req.tenantId;
  tenantObjectId(tenantId);
  const { start, end } = utcMonthBounds();
  const monthTag = start.toISOString().slice(0, 7);

  if (dataset === 'work-orders-this-month') {
    const list = await WorkOrder.find({ tenantId, createdAt: { $gte: start, $lt: end } })
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    const rows = list.map((wo) => ({
      'Work order #': wo.workOrderNumber ?? '',
      Title: wo.title ?? '',
      Status: wo.status ?? '',
      Priority: wo.priority ?? '',
      'Customer name': wo.customerId?.name ?? '',
      'Customer email': wo.customerId?.email ?? '',
      'Customer phone': wo.customerId?.phone ?? '',
      Scheduled: fmtIso(wo.scheduledAt),
      'Completed at': fmtIso(wo.completedAt),
      Created: fmtIso(wo.createdAt),
    }));
    return sendExcelWorkbook(res, `work-orders-this-month-${monthTag}`, 'Work orders', rows);
  }

  if (dataset === 'revenue-this-month') {
    const list = await Invoice.find(paidInMonthFilter(tenantId, start, end))
      .populate('customerId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    const rows = list.map((inv) => ({
      'Invoice #': inv.number ?? '',
      'Invoice seq': inv.invoiceSeq ?? '',
      Total: inv.total ?? 0,
      Subtotal: inv.subtotal ?? 0,
      Tax: inv.tax ?? 0,
      'Paid at': fmtIso(inv.paidAt),
      'Updated at': fmtIso(inv.updatedAt),
      'Customer name': inv.customerId?.name ?? '',
      'Customer email': inv.customerId?.email ?? '',
    }));
    return sendExcelWorkbook(res, `revenue-paid-${monthTag}`, 'Revenue', rows);
  }

  if (dataset === 'open-invoices') {
    const list = await Invoice.find({
      tenantId,
      status: { $in: ['draft', 'sent', 'overdue'] },
    })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    const rows = list.map((inv) => ({
      'Invoice #': inv.number ?? '',
      Status: inv.status ?? '',
      Total: inv.total ?? 0,
      Subtotal: inv.subtotal ?? 0,
      Tax: inv.tax ?? 0,
      'Due date': fmtIso(inv.dueDate),
      'Created at': fmtIso(inv.createdAt),
      'Customer name': inv.customerId?.name ?? '',
      'Customer email': inv.customerId?.email ?? '',
    }));
    return sendExcelWorkbook(res, 'open-invoices', 'Open invoices', rows);
  }

  if (dataset === 'work-orders-all') {
    const list = await WorkOrder.find({ tenantId })
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    const rows = list.map((wo) => ({
      'Work order #': wo.workOrderNumber ?? '',
      Title: wo.title ?? '',
      Status: wo.status ?? '',
      Priority: wo.priority ?? '',
      'Customer name': wo.customerId?.name ?? '',
      'Customer email': wo.customerId?.email ?? '',
      'Customer phone': wo.customerId?.phone ?? '',
      Scheduled: fmtIso(wo.scheduledAt),
      'Completed at': fmtIso(wo.completedAt),
      Created: fmtIso(wo.createdAt),
    }));
    return sendExcelWorkbook(res, 'work-orders-all-time', 'Work orders', rows);
  }

  if (dataset === 'customers') {
    const list = await Customer.find({ tenantId }).sort({ name: 1 }).lean();
    const rows = list.map((c) => ({
      Name: c.name ?? '',
      Email: c.email ?? '',
      Phone: c.phone ?? '',
      Address: c.address ?? '',
      'Billing address': c.billingAddress ?? '',
      Notes: c.notes ?? '',
      'Created at': fmtIso(c.createdAt),
    }));
    return sendExcelWorkbook(res, 'customers', 'Customers', rows);
  }

  if (dataset === 'inventory') {
    const list = await Inventory.find({ tenantId }).populate('categoryId', 'name').sort({ sku: 1 }).lean();
    const rows = list.map((i) => ({
      SKU: i.sku ?? '',
      Name: i.name ?? '',
      Quantity: i.quantity ?? 0,
      Unit: i.unit ?? '',
      'Min quantity': i.minQuantity ?? '',
      Location: i.location ?? '',
      Category: i.categoryId?.name ?? '',
      'Updated at': fmtIso(i.updatedAt),
    }));
    return sendExcelWorkbook(res, 'inventory-items', 'Inventory', rows);
  }

  throw new ApiError(400, 'Unknown export');
});
