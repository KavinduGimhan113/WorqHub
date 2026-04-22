<<<<<<< Updated upstream
/**
 * Work order controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const WorkOrderCounter = require('../models/WorkOrderCounter');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { applyWorkOrderInventoryDelta } = require('../utils/workOrderInventory');

/**
 * Ensure each work order has customerId as { name, email, phone } when a valid ref exists.
 * Covers lean+populate edge cases and raw ObjectId/string ids.
 */
async function attachCustomerDetails(workOrders, tenantId) {
  if (!workOrders?.length) return;
  const ids = new Set();
  for (const wo of workOrders) {
    if (wo == null) continue;
    const c = wo.customerId;
    if (c && typeof c === 'object' && c.name) continue;
    if (c == null) continue;
    let sid = null;
    if (mongoose.Types.ObjectId.isValid(c)) sid = String(c);
    else if (typeof c === 'object' && c._id != null && mongoose.Types.ObjectId.isValid(c._id)) {
      sid = String(c._id);
    }
    if (sid) ids.add(sid);
  }
  if (ids.size === 0) return;
  const customers = await Customer.find({
    _id: { $in: [...ids] },
    tenantId,
  })
    .select('name email phone')
    .lean();
  const map = new Map(customers.map((doc) => [String(doc._id), doc]));
  for (const wo of workOrders) {
    if (wo == null) continue;
    const c = wo.customerId;
    if (c && typeof c === 'object' && c.name) continue;
    let sid = null;
    if (c == null) continue;
    if (mongoose.Types.ObjectId.isValid(c)) sid = String(c);
    else if (typeof c === 'object' && c._id != null && mongoose.Types.ObjectId.isValid(c._id)) {
      sid = String(c._id);
    }
    const doc = sid && map.get(sid);
    if (doc) wo.customerId = doc;
  }
}

/** Align counter with existing workOrderNumber values so the next auto number does not collide. */
async function syncWorkOrderCounterFromDb(tenantId) {
  const [agg] = await WorkOrder.aggregate([
    { $match: { tenantId } },
    { $group: { _id: null, maxNum: { $max: '$workOrderNumber' } } },
  ]);
  const raw = agg?.maxNum;
  const maxFromOrders =
    raw != null && Number.isFinite(Number(raw)) ? Math.floor(Number(raw)) : 0;
  const existing = await WorkOrderCounter.findOne({ tenantId }).lean();
  const seq = existing?.seq || 0;
  const target = Math.max(seq, maxFromOrders);
  const updated = await WorkOrderCounter.findOneAndUpdate(
    { tenantId },
    { $set: { seq: target } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

async function normalizeAssignedEmployeeIds(raw, tenantId) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new ApiError(400, 'assignedEmployeeIds must be an array');
  }
  const ids = [...new Set(raw.map((id) => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const valid = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (valid.length !== ids.length) {
    throw new ApiError(400, 'Invalid employee id in assignment list');
  }
  const count = await Employee.countDocuments({
    _id: { $in: valid },
    tenantId,
  });
  if (count !== valid.length) {
    throw new ApiError(400, 'One or more assigned employees were not found in your organization');
  }
  return valid;
}

/**
 * Normalize work order line items and validate inventoryId belongs to tenant.
 */
async function sanitizeWorkOrderItems(rawItems, tenantId) {
  if (rawItems == null) return [];
  if (!Array.isArray(rawItems)) throw new ApiError(400, 'items must be an array');
  const tid =
    tenantId instanceof mongoose.Types.ObjectId
      ? tenantId
      : new mongoose.Types.ObjectId(String(tenantId));
  const out = [];
  for (const it of rawItems) {
    const name = String(it.name || '').trim();
    if (!name) continue;
    let q = Number(it.quantity);
    if (!Number.isFinite(q) || q < 0) q = 0;
    let categoryId;
    if (it.categoryId != null && mongoose.Types.ObjectId.isValid(String(it.categoryId))) {
      categoryId = new mongoose.Types.ObjectId(String(it.categoryId));
    }
    let inventoryId;
    if (it.inventoryId != null && mongoose.Types.ObjectId.isValid(String(it.inventoryId))) {
      const inv = await Inventory.findOne({
        _id: new mongoose.Types.ObjectId(String(it.inventoryId)),
        tenantId: tid,
      })
        .select('_id')
        .lean();
      if (!inv) {
        throw new ApiError(400, `Inventory item not found for line "${name}"`);
      }
      inventoryId = inv._id;
    }
    const row = { name, quantity: q };
    if (categoryId) row.categoryId = categoryId;
    if (inventoryId) row.inventoryId = inventoryId;
    out.push(row);
  }
  return out;
}

exports.list = asyncHandler(async (req, res) => {
  const { status, employeeId, customerId, page = 1, limit = 20, order } = req.query;
  const filter = { tenantId: req.tenantId };
  if (status) filter.status = status;
  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    filter.assignedEmployeeIds = employeeId;
  }
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    filter.customerId = customerId;
  }
  let lim = Number(limit);
  if (!Number.isFinite(lim) || lim < 1) lim = 20;
  if (lim > 200) lim = 200;
  const skip = (Number(page) - 1) * lim;

  /** Dashboard / analytics: most recently created first. Main list: 001, 002, 003… by workOrderNumber. */
  const orderRecent = String(order || '').toLowerCase() === 'recent';
  if (orderRecent) {
    const [items, total] = await Promise.all([
      WorkOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate('customerId', 'name email phone')
        .populate('assignedEmployeeIds', 'name employeeId email department')
        .lean(),
      WorkOrder.countDocuments(filter),
    ]);
    await attachCustomerDetails(items, req.tenantId);
    res.json({ success: true, data: items, total, page: Number(page), limit: lim });
    return;
  }

  const [idRows, total] = await Promise.all([
    WorkOrder.aggregate([
      { $match: filter },
      {
        $addFields: {
          _sortWo: { $ifNull: ['$workOrderNumber', 2147483647] },
        },
      },
      { $sort: { _sortWo: 1, createdAt: 1 } },
      { $skip: skip },
      { $limit: lim },
      { $project: { _id: 1 } },
    ]),
    WorkOrder.countDocuments(filter),
  ]);
  const ids = idRows.map((r) => r._id);
  let items = [];
  if (ids.length > 0) {
    const rows = await WorkOrder.find({ _id: { $in: ids } })
      .populate('customerId', 'name email phone')
      .populate('assignedEmployeeIds', 'name employeeId email department')
      .lean();
    const rank = new Map(ids.map((id, i) => [String(id), i]));
    rows.sort((a, b) => rank.get(String(a._id)) - rank.get(String(b._id)));
    items = rows;
  }
  await attachCustomerDetails(items, req.tenantId);
  res.json({ success: true, data: items, total, page: Number(page), limit: lim });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('customerId', 'name email phone')
    .populate('assignedEmployeeIds', 'name employeeId email department')
    .lean();
  if (!doc) throw new ApiError(404, 'Work order not found');
  await attachCustomerDetails([doc], req.tenantId);
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  if (!body.customerId || !String(body.customerId).trim()) {
    throw new ApiError(400, 'Customer is required');
  }
  delete body.workOrderNumber;
  if (Object.prototype.hasOwnProperty.call(req.body, 'assignedEmployeeIds')) {
    body.assignedEmployeeIds = await normalizeAssignedEmployeeIds(
      req.body.assignedEmployeeIds,
      req.tenantId
    );
  }

  const sanitizedItems = Array.isArray(req.body.items)
    ? await sanitizeWorkOrderItems(req.body.items, req.tenantId)
    : [];
  body.items = sanitizedItems.length > 0 ? sanitizedItems : undefined;

  await syncWorkOrderCounterFromDb(req.tenantId);
  const counter = await WorkOrderCounter.findOneAndUpdate(
    { tenantId: req.tenantId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  body.workOrderNumber = counter.seq;

  await applyWorkOrderInventoryDelta(req.tenantId, [], sanitizedItems);

  let doc;
  try {
    doc = await WorkOrder.create(body);
  } catch (e) {
    await applyWorkOrderInventoryDelta(req.tenantId, sanitizedItems, []).catch(() => {});
    throw e;
  }

  let populated = await WorkOrder.findById(doc._id)
    .populate('customerId', 'name email phone')
    .populate('assignedEmployeeIds', 'name employeeId email department')
    .lean();
  if (!populated) populated = doc.toObject ? doc.toObject() : doc;
  await attachCustomerDetails([populated], req.tenantId);
  res.status(201).json({ success: true, data: populated });
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!existing) throw new ApiError(404, 'Work order not found');

  const body = { ...req.body };
  delete body.workOrderNumber;
  if (!body.customerId || !String(body.customerId).trim()) {
    throw new ApiError(400, 'Customer is required');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'assignedEmployeeIds')) {
    body.assignedEmployeeIds = await normalizeAssignedEmployeeIds(
      req.body.assignedEmployeeIds,
      req.tenantId
    );
  }

  let sanitizedItems = null;
  if (Object.prototype.hasOwnProperty.call(req.body, 'items')) {
    sanitizedItems = await sanitizeWorkOrderItems(req.body.items, req.tenantId);
    await applyWorkOrderInventoryDelta(req.tenantId, existing.items || [], sanitizedItems);
    body.items = sanitizedItems;
  }

  let updated;
  try {
    updated = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      body,
      { new: true, runValidators: true }
    );
  } catch (e) {
    if (sanitizedItems !== null) {
      await applyWorkOrderInventoryDelta(req.tenantId, sanitizedItems, existing.items || []).catch(() => {});
    }
    throw e;
  }
  if (!updated) {
    if (sanitizedItems !== null) {
      await applyWorkOrderInventoryDelta(req.tenantId, sanitizedItems, existing.items || []).catch(() => {});
    }
    throw new ApiError(404, 'Work order not found');
  }
  const doc = await WorkOrder.findById(updated._id)
    .populate('customerId', 'name email phone')
    .populate('assignedEmployeeIds', 'name employeeId email department')
    .lean();
  await attachCustomerDetails([doc], req.tenantId);
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!existing) throw new ApiError(404, 'Work order not found');
  await applyWorkOrderInventoryDelta(req.tenantId, existing.items || [], []);
  const result = await WorkOrder.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Work order not found');
  res.json({ success: true, message: 'Deleted' });
});
=======
/**
 * Work order controller. All queries scoped by req.tenantId.
 */
const WorkOrder = require('../models/WorkOrder');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { tenantId: req.tenantId };
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WorkOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    WorkOrder.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, total, page: Number(page), limit: Number(limit) });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await WorkOrder.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Work order not found');
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  const doc = await WorkOrder.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await WorkOrder.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Work order not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await WorkOrder.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Work order not found');
  res.json({ success: true, message: 'Deleted' });
});
>>>>>>> Stashed changes
