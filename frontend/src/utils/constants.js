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
 * When unset, localhost/127.0.0.1 use same-origin `/api/v1` (CRA dev `proxy` → backend :5000).
 * Other hosts use `/api/v1` (reverse proxy in production). Override anytime with `REACT_APP_API_URL`.
 */
/**
 * Normalize REACT_APP_API_URL so axios always hits Express under `/api/v1`.
 * - Bare origin → append `/api/v1`
 * - Ends with `/api` only → append `/v1`
 */
function normalizeEnvApiBase(url) {
  let u = String(url).trim().replace(/\/+$/, '');
  if (!u) return u;
  if (/\/api\/v1$/i.test(u)) return u;
  if (/\/api$/i.test(u)) return `${u}/v1`;
  if (/^https?:\/\/[^/]+$/i.test(u)) return `${u}/api/v1`;
  return u;
}

function resolveApiBase() {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl != null && String(envUrl).trim()) return normalizeEnvApiBase(envUrl);
  if (typeof window !== 'undefined' && window.location) {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      /** Same-origin `/api/v1` + package.json `proxy` → `http://localhost:5000` (avoids wrong path / CORS). */
      return '/api/v1';
    }
  }
  return '/api/v1';
}

export const API_BASE = resolveApiBase();

/**
 * Direct API origin for binary downloads (.xlsx). CRA proxy can corrupt bytes; axios JSON defaults
 * can interfere — reports use `fetch` + this URL instead.
 *
 * Optional: `REACT_APP_DEV_BACKEND_ORIGIN=http://localhost:PORT` when the API is not on :5000
 * (no `/api/v1` suffix — it is appended here).
 */
export function resolveBinaryApiBase() {
  const devOrigin = process.env.REACT_APP_DEV_BACKEND_ORIGIN;
  if (devOrigin != null && String(devOrigin).trim()) {
    return `${String(devOrigin).trim().replace(/\/+$/, '')}/api/v1`;
  }
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    return API_BASE;
  }
  if (typeof window !== 'undefined' && window.location) {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return `http://${h}:5000/api/v1`;
    }
  }
  return API_BASE;
}
