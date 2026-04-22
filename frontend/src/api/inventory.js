/**
 * Inventory API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const list = (params) => client.get('/inventory', { params }).then((res) => res.data);
/** Items with quantity below threshold (default 10); returns { threshold, count, items }. */
export const lowStock = (params) => client.get('/inventory/meta/low-stock', { params }).then((res) => res.data);
/** Next auto SKU (WIDGET-001 pattern) for new-item form — does not reserve the number until create. */
export const suggestNextSku = () => client.get('/inventory/next-sku').then((res) => res.data);
export const get = (id) => client.get(`/inventory/${id}`).then((res) => res.data);
export const create = (data) => client.post('/inventory', data).then((res) => res.data);
export const update = (id, data) => client.put(`/inventory/${id}`, data).then((res) => res.data);
export const remove = (id) => client.delete(`/inventory/${id}`).then((res) => res.data);

/** Inventory categories — under /inventory/categories (sub-router on backend avoids /:id clash) */
export const listCategories = () => client.get('/inventory/categories').then((res) => res.data);
export const createCategory = (name) =>
  client.post('/inventory/categories', { name }).then((res) => res.data);
export const removeCategory = (id) =>
  client.delete(`/inventory/categories/${id}`).then((res) => res.data);

