/**
 * Tenant controller. Admin-only; used for tenant CRUD (e.g. onboarding).
 */
const Tenant = require('../models/Tenant');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const tenants = await Tenant.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: tenants });
});

exports.get = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  res.json({ success: true, data: tenant });
});

exports.create = asyncHandler(async (req, res) => {
  const tenant = await Tenant.create(req.body);
  res.status(201).json({ success: true, data: tenant });
});

exports.update = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  res.json({ success: true, data: tenant });
});
