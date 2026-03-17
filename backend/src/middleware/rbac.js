/**
 * Role-based access control.
 * requireRole(['Admin', 'Manager']) — must run after auth.
 */
const ApiError = require('../utils/ApiError');
const { ROLES } = require('./auth');

const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.role) {
    return next(new ApiError(401, 'Authentication required'));
  }
  if (!allowedRoles.includes(req.role)) {
    return next(new ApiError(403, 'Insufficient permissions'));
  }
  next();
};

// Convenience: Admin and SuperAdmin
const requireAdmin = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
// Manager and above
const requireManager = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER]);

module.exports = { requireRole, requireAdmin, requireManager };
