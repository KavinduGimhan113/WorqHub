/**
 * Employee controller. All queries scoped by req.tenantId.
 */
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const WorkOrder = require('../models/WorkOrder');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validatePhone } = require('../utils/phone');

function applyPhoneValidation(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'phone')) return;
  const result = validatePhone(body.phone);
  if (!result.ok) throw new ApiError(400, result.message);
  body.phone = result.value;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Employee.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
});

/** Work orders per employee (_id → count) for the Employees directory. */
exports.assignedWorkCounts = asyncHandler(async (req, res) => {
  const tid =
    req.tenantId instanceof mongoose.Types.ObjectId
      ? req.tenantId
      : new mongoose.Types.ObjectId(req.tenantId);
  const rows = await WorkOrder.aggregate([
    { $match: { tenantId: tid, assignedEmployeeIds: { $exists: true, $ne: [] } } },
    { $unwind: '$assignedEmployeeIds' },
    { $group: { _id: '$assignedEmployeeIds', count: { $sum: 1 } } },
  ]);
  const data = {};
  for (const row of rows) {
    if (row._id) data[String(row._id)] = row.count;
  }
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, data: doc });
});

async function getNextEmployeeId(tenantId) {
  const last = await Employee.findOne({ tenantId, employeeId: /^EMP\s*\d+$/i })
    .sort({ employeeId: -1 })
    .select('employeeId')
    .lean();
  if (!last?.employeeId) return 'EMP 0001';
  const num = parseInt(last.employeeId.replace(/\D/g, ''), 10) || 0;
  return `EMP ${String(num + 1).padStart(4, '0')}`;
}

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  applyPhoneValidation(body);
  if (!body.employeeId || !body.employeeId.trim()) {
    body.employeeId = await getNextEmployeeId(req.tenantId);
  }
  const doc = await Employee.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  applyPhoneValidation(body);
  const doc = await Employee.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    body,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Employee.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Employee not found');
  res.json({ success: true, message: 'Deleted' });
});
