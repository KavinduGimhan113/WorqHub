/**
 * Inventory controller. All queries scoped by req.tenantId.
 */
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Inventory.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Inventory.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Inventory item not found');
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  const doc = await Inventory.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await Inventory.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Inventory item not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Inventory.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Inventory item not found');
  res.json({ success: true, message: 'Deleted' });
});
