/**
 * Inventory categories — tenant-scoped manual labels for items.
 */
const InventoryCategory = require('../models/InventoryCategory');
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const items = await InventoryCategory.find({ tenantId: req.tenantId }).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
});

exports.create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new ApiError(400, 'Category name is required');
  try {
    const doc = await InventoryCategory.create({ tenantId: req.tenantId, name });
    res.status(201).json({ success: true, data: doc });
  } catch (e) {
    if (e.code === 11000) {
      throw new ApiError(400, 'You already registered a category with this name.');
    }
    throw e;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const inUse = await Inventory.countDocuments({
    tenantId: req.tenantId,
    categoryId: req.params.id,
  });
  if (inUse > 0) {
    throw new ApiError(400, 'Cannot delete: category is assigned to one or more inventory items');
  }
  const result = await InventoryCategory.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Category not found');
  res.json({ success: true, message: 'Deleted' });
});
