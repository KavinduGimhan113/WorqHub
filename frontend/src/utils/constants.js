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

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
