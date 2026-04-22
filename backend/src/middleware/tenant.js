/**
 * Tenant context middleware.
 * Ensures tenantId is present on req (must run after auth).
 */
const ApiError = require('../utils/ApiError');

const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return next(new ApiError(403, 'Tenant context required'));
  }
  next();
};

module.exports = { requireTenant };
