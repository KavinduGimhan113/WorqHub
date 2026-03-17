/**
 * Invoice controller. All queries scoped by req.tenantId.
 */
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId };
  const items = await Invoice.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Invoice.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
  if (!doc) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, data: doc });
});

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body, tenantId: req.tenantId };
  if (body.customerId === '' || body.customerId == null) delete body.customerId;
  const doc = await Invoice.create(body);
  res.status(201).json({ success: true, data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.customerId === '' || body.customerId == null) body.customerId = undefined;
  const doc = await Invoice.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    body,
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Invoice.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!result.deletedCount) throw new ApiError(404, 'Invoice not found');
  res.json({ success: true, message: 'Deleted' });
});
