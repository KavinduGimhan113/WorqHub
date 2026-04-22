/**
 * Expenses API (tenant-scoped).
 */
import client from './client';

export const list = (params) => client.get('/expenses', { params }).then((res) => res.data);
export const summary = () => client.get('/expenses/summary').then((res) => res.data);
export const get = (id) => client.get(`/expenses/${id}`).then((res) => res.data);
export const create = (data) => client.post('/expenses', data).then((res) => res.data);
export const update = (id, data) => client.put(`/expenses/${id}`, data).then((res) => res.data);
export const remove = (id) => client.delete(`/expenses/${id}`).then((res) => res.data);
