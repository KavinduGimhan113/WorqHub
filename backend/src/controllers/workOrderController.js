/**
 * Work order controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

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

exports.list = asyncHandler(async (req, res) => {
  const { status, employeeId, page = 1, limit = 20 } = req.query;
  const filter = { tenantId: req.tenantId };
  if (status) filter.status = status;
  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    filter.assignedEmployeeIds = employeeId;
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('customerId', 'name email phone')
      .populate('assignedEmployeeIds', 'name employeeId email department')
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);
  await attachCustomerDetails(items, req.tenantId);
  res.json({ success: true, data: items, total, page: Number(page), limit: Number(limit) });
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
  if (Object.prototype.hasOwnProperty.call(req.body, 'assignedEmployeeIds')) {
    body.assignedEmployeeIds = await normalizeAssignedEmployeeIds(
      req.body.assignedEmployeeIds,
      req.tenantId
    );
  }
  const doc = await WorkOrder.create(body);
  let populated = await WorkOrder.findById(doc._id)
    .populate('customerId', 'name email phone')
    .populate('assignedEmployeeIds', 'name employeeId email department')
    .lean();
  if (!populated) populated = doc.toObject ? doc.toObject() : doc;
  await attachCustomerDetails([populated], req.tenantId);
  res.status(201).json({ success: true, data: populated });
});

exports.update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.customerId || !String(body.customerId).trim()) {
    throw new ApiError(400, 'Customer is required');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'assignedEmployeeIds')) {
    body.assignedEmployeeIds = await normalizeAssignedEmployeeIds(
      req.body.assignedEmployeeIds,
      req.tenantId
    );
  }
  const updated = await WorkOrder.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    body,
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(404, 'Work order not found');
  const doc = await WorkOrder.findById(updated._id)
    .populate('customerId', 'name email phone')
    .populate('assignedEmployeeIds', 'name employeeId email department')
    .lean();
  await attachCustomerDetails([doc], req.tenantId);
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await WorkOrder.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Work order not found');
  res.json({ success: true, message: 'Deleted' });
});
