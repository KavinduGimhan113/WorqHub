<<<<<<< Updated upstream
/**
 * Customer controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const CustomerCounter = require('../models/CustomerCounter');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  formatCustomerCode,
  maxCustomerNumberFromCodes,
  compareCustomerCodes,
  isValidCustomerCode,
} = require('../utils/customerCode');

/** Consistent ObjectId for tenant-scoped queries (JWT stores string ids). */
function tenantObjectId(tenantId) {
  if (tenantId == null || tenantId === '') return null;
  let raw = tenantId;
  if (typeof raw === 'object' && raw !== null && raw.$oid) raw = raw.$oid;
  const s = String(raw).trim();
  if (!mongoose.isValidObjectId(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

/**
 * Match documents whether tenantId was stored as ObjectId or string (legacy / driver quirks).
 * Plain `{ tenantId: oid }` updates can otherwise match 0 docs while find still returns rows.
 */
function tenantScopeFilter(tenantId) {
  const tid = tenantObjectId(tenantId);
  if (!tid) return null;
  const asString = String(tid);
  return { $or: [{ tenantId: tid }, { tenantId: asString }] };
}

async function syncCustomerCounterFromDb(tenantId) {
  const scope = tenantScopeFilter(tenantId);
  if (!scope) return 0;
  const tid = tenantObjectId(tenantId);
  const items = await Customer.find(scope).select('customerCode').lean();
  const maxFrom = maxCustomerNumberFromCodes(items.map((i) => i.customerCode));
  const existing = await CustomerCounter.findOne({ tenantId: tid }).lean();
  const seq = existing?.seq || 0;
  const target = Math.max(seq, maxFrom);
  await CustomerCounter.findOneAndUpdate(
    { tenantId: tid },
    { $set: { seq: target } },
    { new: true, upsert: true }
  );
  return target;
}

/** Assign CUS-### to rows without a valid code (oldest first). */
async function backfillMissingCustomerCodes(tenantId) {
  const scope = tenantScopeFilter(tenantId);
  if (!scope) return;
  const tid = tenantObjectId(tenantId);
  const all = await Customer.find(scope).sort({ createdAt: 1 }).select('_id customerCode').lean();
  const missing = all.filter((row) => !isValidCustomerCode(row.customerCode));
  if (missing.length === 0) return;
  await syncCustomerCounterFromDb(tenantId);
  for (const row of missing) {
    const counter = await CustomerCounter.findOneAndUpdate(
      { tenantId: tid },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const code = formatCustomerCode(counter.seq);
    // Update by _id only — tenantId in filter often fails when BSON type != query type.
    const result = await Customer.updateOne({ _id: row._id }, { $set: { customerCode: code } });
    if (result.matchedCount === 0) {
      await Customer.collection.updateOne({ _id: row._id }, { $set: { customerCode: code } });
    }
  }
}

exports.list = asyncHandler(async (req, res) => {
  const scope = tenantScopeFilter(req.tenantId);
  if (!scope) throw new ApiError(403, 'Invalid tenant');
  await backfillMissingCustomerCodes(req.tenantId);
  const items = await Customer.find(scope).lean();
  items.sort((a, b) => compareCustomerCodes(a.customerCode, b.customerCode));
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  const scope = tenantScopeFilter(req.tenantId);
  if (!scope) throw new ApiError(403, 'Invalid tenant');
  let doc = await Customer.findOne({ _id: req.params.id, ...scope }).lean();
  if (!doc) throw new ApiError(404, 'Customer not found');
  if (!isValidCustomerCode(doc.customerCode)) {
    await backfillMissingCustomerCodes(req.tenantId);
    doc = await Customer.findOne({ _id: req.params.id, ...scope }).lean();
  }
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const tid = tenantObjectId(req.tenantId);
  if (!tid) throw new ApiError(403, 'Invalid tenant');
  const body = { ...req.body, tenantId: tid };
  delete body.customerCode;
  await syncCustomerCounterFromDb(req.tenantId);
  const counter = await CustomerCounter.findOneAndUpdate(
    { tenantId: tid },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  body.customerCode = formatCustomerCode(counter.seq);
  const doc = await Customer.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const scope = tenantScopeFilter(req.tenantId);
  if (!scope) throw new ApiError(403, 'Invalid tenant');
  const body = { ...req.body };
  delete body.customerCode;
  delete body.tenantId;
  const doc = await Customer.findOneAndUpdate(
    { _id: req.params.id, ...scope },
    body,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const scope = tenantScopeFilter(req.tenantId);
  if (!scope) throw new ApiError(403, 'Invalid tenant');
  const result = await Customer.deleteOne({ _id: req.params.id, ...scope });
  if (!result.deletedCount) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, message: 'Deleted' });
});
=======
/**
 * Customer controller. All queries scoped by req.tenantId.
 */
const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Customer.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Customer.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  const doc = await Customer.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await Customer.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Customer.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, message: 'Deleted' });
});
>>>>>>> Stashed changes
