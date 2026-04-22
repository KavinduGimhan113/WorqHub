/**
 * Customers API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const list = (params) => client.get('/customers', { params }).then((res) => res.data);
export const get = (id) => client.get(`/customers/${id}`).then((res) => res.data);
export const create = (data) => client.post('/customers', data).then((res) => res.data);
export const update = (id, data) => client.put(`/customers/${id}`, data).then((res) => res.data);
export const remove = (id) => client.delete(`/customers/${id}`).then((res) => res.data);
