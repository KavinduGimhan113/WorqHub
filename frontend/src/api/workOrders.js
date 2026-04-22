/**
 * Work orders API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const list = (params) => client.get('/work-orders', { params }).then((res) => res.data);
export const get = (id) => client.get(`/work-orders/${id}`).then((res) => res.data);
export const create = (data) => client.post('/work-orders', data).then((res) => res.data);
export const update = (id, data) => client.put(`/work-orders/${id}`, data).then((res) => res.data);
export const remove = (id) => client.delete(`/work-orders/${id}`).then((res) => res.data);
