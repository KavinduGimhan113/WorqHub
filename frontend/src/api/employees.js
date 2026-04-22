/**
 * Employees API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const list = (params) => client.get('/employees', { params }).then((res) => res.data);
export const get = (id) => client.get(`/employees/${id}`).then((res) => res.data);
export const create = (data) => client.post('/employees', data).then((res) => res.data);
export const update = (id, data) => client.put(`/employees/${id}`, data).then((res) => res.data);
export const remove = (id) => client.delete(`/employees/${id}`).then((res) => res.data);
