/**
 * Auth service: login, token generation, password hashing.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const ApiError = require('../utils/ApiError');
const { jwtSecret } = require('../config/env');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, tenantId: user.tenantId, role: user.role },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  );
}

async function login(email, password, tenantId) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const filter = { email: normalizedEmail, isActive: true };
  if (tenantId) filter.tenantId = tenantId;
  const user = await User.findOne(filter).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');
  const token = generateToken(user);
  const { passwordHash, ...safe } = user.toObject();
  const tenant = await Tenant.findById(user.tenantId).select('name').lean();
  return { user: { ...safe, tenantName: tenant?.name || '' }, token };
}

module.exports = { hashPassword, comparePassword, generateToken, login };
