<<<<<<< Updated upstream
/**
 * Auth controller: register, login, me.
 */
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.register = asyncHandler(async (req, res) => {
  const { email, password, name, role, tenantId } = req.body;
  if (!tenantId) throw new ApiError(400, 'tenantId required');
  const tenant = await Tenant.findById(tenantId);
  if (!tenant?.isActive) throw new ApiError(404, 'Tenant not found');
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const existing = await User.findOne({ tenantId, email: normalizedEmail });
  if (existing) throw new ApiError(400, 'Email already registered for this tenant');
  const passwordHash = await authService.hashPassword(password);
  const user = await User.create({ tenantId, email: normalizedEmail, passwordHash, name, role: role || 'Staff' });
  const token = authService.generateToken(user);
  const { passwordHash: _, ...safe } = user.toObject();
  res.status(201).json({
    success: true,
    user: { ...safe, tenantName: tenant?.name || '' },
    token,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, tenantId } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');
  const result = await authService.login(email, password, tenantId);
  res.json({ success: true, ...result });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash').lean();
  if (!user) throw new ApiError(404, 'User not found');
  const tenant = await Tenant.findById(user.tenantId).select('name').lean();
  res.json({
    success: true,
    user: { ...user, tenantName: tenant?.name || '' },
  });
});
=======
/**
 * Auth controller: register, login, me.
 */
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.register = asyncHandler(async (req, res) => {
  const { email, password, name, role, tenantId } = req.body;
  if (!tenantId) throw new ApiError(400, 'tenantId required');
  const tenant = await Tenant.findById(tenantId);
  if (!tenant?.isActive) throw new ApiError(404, 'Tenant not found');
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const existing = await User.findOne({ tenantId, email: normalizedEmail });
  if (existing) throw new ApiError(400, 'Email already registered for this tenant');
  const passwordHash = await authService.hashPassword(password);
  const user = await User.create({ tenantId, email: normalizedEmail, passwordHash, name, role: role || 'Staff' });
  const token = authService.generateToken(user);
  const { passwordHash: _, ...safe } = user.toObject();
  res.status(201).json({ success: true, user: safe, token });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, tenantId } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');
  const result = await authService.login(email, password, tenantId);
  res.json({ success: true, ...result });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash').lean();
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
});
>>>>>>> Stashed changes
