/**
 * Reports API. All calls include JWT; backend scopes by tenantId.
 */
import client from './client';
import { resolveBinaryApiBase } from '../utils/constants';

export const dashboard = () => client.get('/reports/dashboard').then((res) => res.data);
export const workOrderStats = (params) => client.get('/reports/work-orders', { params }).then((res) => res.data);

const EXPORT_DATASETS = new Set([
  'work-orders-this-month',
  'revenue-this-month',
  'open-invoices',
  'work-orders-all',
  'customers',
  'inventory',
]);

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function utf8ArrayBuffer(ab) {
  return new TextDecoder('utf-8', { fatal: false }).decode(ab);
}

function parseApiErrorPayload(text) {
  let msg = '';
  try {
    const j = JSON.parse(text);
    if (j?.message != null) msg = String(j.message);
  } catch {
    if (text && text.length < 800 && !text.trimStart().startsWith('<')) msg = text.trim();
  }
  if (msg) return msg;
  if (text && text.trim()) return text.trim().length <= 200 ? text.trim() : `${text.trim().slice(0, 200)}…`;
  return 'Export failed';
}

function parseFilenameFromCd(cd) {
  if (!cd) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
  const plain = /filename="([^"]+)"/i.exec(cd) || /filename=([^;\s]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1].replace(/^"|"$/g, '').trim());
    } catch {
      return star[1].replace(/^"|"$/g, '').trim();
    }
  }
  if (plain) return plain[1].replace(/^"|"$/g, '').trim();
  return null;
}

/**
 * Download .xlsx via fetch (not axios) so the body stays raw bytes — avoids proxy/axios quirks.
 */
export async function downloadReportExcel(dataset) {
  if (!EXPORT_DATASETS.has(dataset)) {
    throw new Error('Invalid export');
  }

  const base = resolveBinaryApiBase().replace(/\/+$/, '');
  const url = `${base}/reports/export/${dataset}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
  } catch (e) {
    const hint =
      base.includes('127.0.0.1') || base.includes('localhost')
        ? ' Is the API running? If it uses a port other than 5000, set REACT_APP_DEV_BACKEND_ORIGIN in .env (e.g. http://localhost:5001) and restart npm start.'
        : '';
    throw new Error(((e && e.message) || 'Network error') + hint);
  }

  const ab = await res.arrayBuffer();

  if (!res.ok) {
    const errText = parseApiErrorPayload(utf8ArrayBuffer(ab));
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new Error(errText || `Request failed (${res.status})`);
  }

  const u8 = new Uint8Array(ab);
  const looksLikeZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b; /* PK */

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const probablyJson =
    ct.includes('application/json') || (u8.length > 0 && u8[0] === 0x7b /* { */ && u8.length < 65536);

  if (!looksLikeZip && (probablyJson || u8.length < 256)) {
    throw new Error(parseApiErrorPayload(utf8ArrayBuffer(ab)));
  }

  let filename = `report-${dataset}.xlsx`;
  const cd = res.headers.get('content-disposition');
  const parsed = parseFilenameFromCd(cd);
  if (parsed) filename = parsed;

  const blob = new Blob([ab], { type: XLSX_MIME });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
