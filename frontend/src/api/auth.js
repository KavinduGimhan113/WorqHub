/**
 * Auth API: login, register, getCurrentUser.
 */
import client from './client';

export const login = (email, password, tenantId) =>
  client.post('/auth/login', { email, password, tenantId }).then((res) => res.data);

export const register = (body) =>
  client.post('/auth/register', body).then((res) => res.data);

export const getCurrentUser = () =>
  client.get('/auth/me').then((res) => res.data);
