/**
 * Expense CRUD + summary. Scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function tenantOid(tenantId) {
  if (!tenantId) return null;
  try {
    return new mongoose.Types.ObjectId(tenantId);
  } catch {
    return null;
  }
}

function parseDateStart(s) {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateEnd(s) {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Accept YYYY-MM-DD (recommended) or ISO strings; store as Date. */
function parseExpenseDateInput(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const s = String(raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

exports.summary = asyncHandler(async (req, res) => {
  const tid = tenantOid(req.tenantId);
  if (!tid) throw new ApiError(400, 'Invalid tenant');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [allTime, thisMonth] = await Promise.all([
    Expense.aggregate([
      { $match: { tenantId: tid } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      {
        $match: {
          tenantId: tid,
          expenseDate: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const at = allTime[0] || { total: 0, count: 0 };
  const mt = thisMonth[0] || { total: 0, count: 0 };

  res.json({
    success: true,
    data: {
      totalAllTime: Math.round((Number(at.total) || 0) * 100) / 100,
      countAllTime: at.count || 0,
      totalThisMonth: Math.round((Number(mt.total) || 0) * 100) / 100,
      countThisMonth: mt.count || 0,
    },
  });
});

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const from = parseDateStart(req.query.from);
  const to = parseDateEnd(req.query.to);
  if (from || to) {
    filter.expenseDate = {};
    if (from) filter.expenseDate.$gte = from;
    if (to) filter.expenseDate.$lte = to;
  }
  const items = await Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid expense id');
  }
  const doc = await Expense.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Expense not found');
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.tenantId)) {
    throw new ApiError(400, 'Invalid tenant context');
  }

  const amt = Number(req.body?.amount);
  if (!Number.isFinite(amt) || amt < 0) {
    throw new ApiError(400, 'Valid amount is required');
  }

  const rawDate = req.body?.expenseDate;
  if (rawDate == null || rawDate === '') {
    throw new ApiError(400, 'Expense date is required');
  }
  const expenseDate = parseExpenseDateInput(rawDate);
  if (!expenseDate) {
    throw new ApiError(400, 'Invalid expense date');
  }

  const description =
    req.body?.description != null ? String(req.body.description).trim() : '';
  const vendorRaw = req.body?.vendor != null ? String(req.body.vendor).trim() : '';
  const notesRaw = req.body?.notes != null ? String(req.body.notes).trim() : '';

  const doc = await Expense.create({
    tenantId: req.tenantId,
    amount: Math.round(amt * 100) / 100,
    expenseDate,
    category: (req.body?.category && String(req.body.category).trim()) || 'other',
    description,
    vendor: vendorRaw || undefined,
    paymentMethod: (req.body?.paymentMethod && String(req.body.paymentMethod).trim()) || 'other',
    notes: notesRaw || undefined,
  });
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid expense id');
  }
  const patch = {};
  if (req.body.amount != null) {
    const amt = Number(req.body.amount);
    if (!Number.isFinite(amt) || amt < 0) throw new ApiError(400, 'Valid amount is required');
    patch.amount = Math.round(amt * 100) / 100;
  }
  if (req.body.expenseDate != null && req.body.expenseDate !== '') {
    const d = parseExpenseDateInput(req.body.expenseDate);
    if (!d) throw new ApiError(400, 'Invalid expense date');
    patch.expenseDate = d;
  }
  if (req.body.category != null) patch.category = String(req.body.category).trim() || 'other';
  if (req.body.description != null) patch.description = String(req.body.description).trim();
  if (req.body.vendor !== undefined) {
    const v = req.body.vendor != null ? String(req.body.vendor).trim() : '';
    patch.vendor = v || undefined;
  }
  if (req.body.paymentMethod != null) {
    patch.paymentMethod = String(req.body.paymentMethod).trim() || 'other';
  }
  if (req.body.notes !== undefined) {
    const n = req.body.notes != null ? String(req.body.notes).trim() : '';
    patch.notes = n || undefined;
  }

  const doc = await Expense.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: patch },
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Expense not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid expense id');
  }
  const result = await Expense.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Expense not found');
  res.json({ success: true, message: 'Deleted' });
});
