/**
 * JWT authentication middleware.
 * Validates token and attaches user, tenantId, role to req.
 */
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { jwtSecret } = require('../config/env');

const ROLES = Object.freeze({ SUPER_ADMIN: 'SuperAdmin', ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Staff' });

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.role = decoded.role;
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

module.exports = { auth, ROLES };
