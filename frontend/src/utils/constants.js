/**
 * App constants: roles, routes, API base.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
});

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  WORK_ORDERS: '/work-orders',
  CUSTOMERS: '/customers',
  INVENTORY: '/inventory',
  BILLING: '/billing',
  REPORTS: '/reports',
  SETTINGS: '/settings',
};

/**
 * API origin + version prefix.
 *
 * `REACT_APP_API_URL` is read when the bundle is built (Create React App inlines it at compile time).
 * Set it in `.env` / CI before `npm run build` for production API hosts.
 *
 * When unset, we pick the default at load time in the browser: localhost → direct backend :5000;
 * otherwise same-origin `/api/v1` (reverse proxy). This avoids relying on compile-time `NODE_ENV`
 * for that choice (production builds served on localhost for smoke tests still get :5000).
 */
function resolveApiBase() {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl != null && String(envUrl).trim()) return String(envUrl).trim();
  if (typeof window !== 'undefined' && window.location) {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:5000/api/v1';
    }
  }
  return '/api/v1';
}

export const API_BASE = resolveApiBase();
