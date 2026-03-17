/**
 * Billing / Invoices API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const listInvoices = (params) => client.get('/billing/invoices', { params }).then((res) => res.data);
export const getInvoice = (id) => client.get(`/billing/invoices/${id}`).then((res) => res.data);
export const createInvoice = (data) => client.post('/billing/invoices', data).then((res) => res.data);
export const updateInvoice = (id, data) => client.put(`/billing/invoices/${id}`, data).then((res) => res.data);
export const deleteInvoice = (id) => client.delete(`/billing/invoices/${id}`).then((res) => res.data);
