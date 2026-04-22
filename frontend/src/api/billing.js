<<<<<<< Updated upstream
/**
 * Billing / Invoices API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const listInvoices = (params) => client.get('/billing/invoices', { params }).then((res) => res.data);
/** Uses /invoice-next-number so the path never collides with GET /invoices/:id (Express 5). */
export const suggestNextInvoiceNumber = () =>
  client.get('/billing/invoice-next-number').then((res) => res.data);
export const getInvoice = (id) => client.get(`/billing/invoices/${id}`).then((res) => res.data);
export const createInvoice = (data) => client.post('/billing/invoices', data).then((res) => res.data);
export const updateInvoice = (id, data) => client.put(`/billing/invoices/${id}`, data).then((res) => res.data);
export const deleteInvoice = (id) => client.delete(`/billing/invoices/${id}`).then((res) => res.data);

function invoiceIdFromArg(id) {
  if (id == null) return '';
  if (typeof id === 'object' && typeof id.toString === 'function') return String(id.toString()).trim();
  return String(id).trim();
}

/**
 * Fetches the invoice PDF (same auth as other billing calls).
 * @param {string|object} id Invoice id
 * @param {{ targetWindow?: Window }} [options] If set, PDF is shown in this tab (open with `window.open('about:blank')` in the same click handler *before* awaiting — avoids popup blockers after async fetch).
 */
export async function downloadInvoicePdf(id, options = {}) {
  const { targetWindow } = options;
  const invoiceId = invoiceIdFromArg(id);
  if (!invoiceId || invoiceId === '[object Object]') throw new Error('Missing invoice id');

  const res = await client.get(`/billing/download-invoice/${encodeURIComponent(invoiceId)}`, {
    responseType: 'blob',
    validateStatus: () => true,
  });

  const ct = (res.headers['content-type'] || '').toLowerCase();

  if (res.status !== 200) {
    let message = `Download failed (${res.status})`;
    try {
      const text = await res.data.text();
      const body = JSON.parse(text);
      if (body?.message) message = body.message;
      else if (res.status === 404) {
        message =
          'Invoice not found for this account, or the server is running an older API build without PDF download. Redeploy/restart the backend and run npm install (pdfkit).';
      }
    } catch {
      if (res.status === 404) {
        message =
          'PDF download returned 404 (route missing on server). Restart the backend after git pull and ensure GET /api/v1/billing/download-invoice/:id exists.';
      }
    }
    throw new Error(message);
  }

  if (!ct.includes('application/pdf')) {
    let hint = '';
    try {
      const text = await res.data.text();
      const body = JSON.parse(text);
      hint = body?.message || '';
    } catch {
      /* ignore */
    }
    throw new Error(hint || 'Server did not return a PDF');
  }

  const blob =
    res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
    setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  let filename = 'invoice.pdf';
  const cd = res.headers['content-disposition'];
  if (cd) {
    const m = /filename="([^"]+)"/.exec(cd) || /filename=([^;\s]+)/.exec(cd);
    if (m) filename = m[1].trim().replace(/['"]/g, '');
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
=======
/**
 * Billing / Invoices API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';

export const listInvoices = (params) => client.get('/billing/invoices', { params }).then((res) => res.data);
export const getInvoice = (id) => client.get(`/billing/invoices/${id}`).then((res) => res.data);
export const createInvoice = (data) => client.post('/billing/invoices', data).then((res) => res.data);
export const updateInvoice = (id, data) => client.put(`/billing/invoices/${id}`, data).then((res) => res.data);
export const deleteInvoice = (id) => client.delete(`/billing/invoices/${id}`).then((res) => res.data);
>>>>>>> Stashed changes
