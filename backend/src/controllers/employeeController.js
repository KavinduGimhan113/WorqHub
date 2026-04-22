/**
 * Employee controller. All queries scoped by req.tenantId.
 */
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Employee.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
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
  if (!body.employeeId || !body.employeeId.trim()) {
    body.employeeId = await getNextEmployeeId(req.tenantId);
  }
  const doc = await Employee.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await Employee.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
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
