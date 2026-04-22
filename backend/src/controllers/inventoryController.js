<<<<<<< Updated upstream
/**
 * Inventory controller. All queries scoped by req.tenantId.
 */
const Inventory = require('../models/Inventory');
const InventoryCounter = require('../models/InventoryCounter');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { formatSku, maxWidgetNumberFromSkus, compareWidgetSkus } = require('../utils/inventorySku');

/** Align counter with existing WIDGET-### SKUs so the next auto SKU does not collide. */
async function syncInventoryCounterFromDb(tenantId) {
  const items = await Inventory.find({ tenantId }).select('sku').lean();
  const maxFromSkus = maxWidgetNumberFromSkus(items.map((i) => i.sku));
  const existing = await InventoryCounter.findOne({ tenantId }).lean();
  const seq = existing?.seq || 0;
  const target = Math.max(seq, maxFromSkus);
  const updated = await InventoryCounter.findOneAndUpdate(
    { tenantId },
    { $set: { seq: target } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Inventory.find(filter)
    .populate('categoryId', 'name')
    .lean();
  items.sort((a, b) => compareWidgetSkus(a.sku, b.sku));
  res.json({ success: true, data: items });
});

/** Items with quantity strictly below `threshold` (default 10), for dashboard alerts. */
exports.lowStock = asyncHandler(async (req, res) => {
  let threshold = Number(req.query.threshold);
  if (!Number.isFinite(threshold) || threshold < 1) threshold = 10;
  if (threshold > 10000) threshold = 10000;
  let limit = Number(req.query.limit);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const filter = { tenantId: req.tenantId, quantity: { $lt: threshold } };
  const [count, items] = await Promise.all([
    Inventory.countDocuments(filter),
    Inventory.find(filter)
      .sort({ quantity: 1, name: 1 })
      .limit(limit)
      .select('sku name quantity')
      .lean(),
  ]);

  res.json({
    success: true,
    data: { threshold, count, items },
  });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Inventory.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('categoryId', 'name')
    .lean();
  if (!doc) throw new ApiError(404, 'Inventory item not found');
  res.json({ success: true, data: doc });
});

/** Next auto SKU for forms (does not consume a number). */
exports.suggestNextSku = asyncHandler(async (req, res) => {
  const seq = await syncInventoryCounterFromDb(req.tenantId);
  res.json({ success: true, data: { sku: formatSku(seq + 1) } });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  if (!String(body.sku || '').trim()) {
    await syncInventoryCounterFromDb(req.tenantId);
    const counter = await InventoryCounter.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    body.sku = formatSku(counter.seq);
  }
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
=======
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
>>>>>>> Stashed changes
