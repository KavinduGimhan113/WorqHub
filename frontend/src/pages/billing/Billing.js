/**
 * Billing page. List and manage invoices.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as billingApi from '../../api/billing';
import ActionButtons from '../../components/ActionButtons';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyAmount, normalizeCurrencyCode } from '../../utils/money';

const statusClass = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-cancelled',
};

function invoiceCustomerLabel(inv) {
  const c = inv?.customerId;
  if (c && typeof c === 'object' && c.name) return String(c.name).trim() || '—';
  return '—';
}

function csvEscape(cell) {
  const s = cell == null ? '' : String(cell);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** First and last calendar day for YYYY-MM (month input). */
function rangeFromMonthInput(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return { from: '', to: '' };
  const [y, m] = monthStr.split('-').map(Number);
  const from = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function Billing() {
  const { user } = useAuth();
  const currency = normalizeCurrencyCode(user?.tenantCurrency);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [monthQuick, setMonthQuick] = useState('');

  const loadList = useCallback(() => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.createdFrom = dateFrom;
    if (dateTo) params.createdTo = dateTo;
    billingApi
      .listInvoices(params)
      .then((res) => setInvoices(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setInvoices([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load invoices');
        }
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const exportCsv = () => {
    const headers = ['Invoice #', 'Customer', 'Status', 'Created', 'Due date', `Amount (${currency})`];
    const rows = invoices.map((inv) => {
      const created = inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '—';
      const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—';
      return [
        inv.number ?? '',
        invoiceCustomerLabel(inv),
        inv.status ?? '',
        created,
        due,
        inv.total != null ? String(inv.total) : '',
      ];
    });
    const body = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${dateFrom || 'all'}-to-${dateTo || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const monthQuickLabel = useMemo(() => {
    if (!monthQuick) return '';
    try {
      const [y, m] = monthQuick.split('-');
      return new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return monthQuick;
    }
  }, [monthQuick]);

  if (loading && invoices.length === 0) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">Billing</h2>
        <Link to="/billing/new" className="btn btn-primary">
          New invoice
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Create invoices, track payments, and manage overdue amounts.
      </p>

      <div
        className="card card-body"
        style={{ marginBottom: '1.25rem', maxWidth: 900, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}
      >
        <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
          <label className="label" htmlFor="inv-filter-from">Created from</label>
          <input
            id="inv-filter-from"
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setMonthQuick('');
            }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
          <label className="label" htmlFor="inv-filter-to">Created to</label>
          <input
            id="inv-filter-to"
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setMonthQuick('');
            }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
          <label className="label" htmlFor="inv-filter-month">Or pick month</label>
          <input
            id="inv-filter-month"
            type="month"
            className="input"
            value={monthQuick}
            onChange={(e) => {
              const v = e.target.value;
              setMonthQuick(v);
              const { from, to } = rangeFromMonthInput(v);
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setMonthQuick('');
            }}
          >
            Clear dates
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCsv}
            disabled={invoices.length === 0}
          >
            Export CSV (Excel)
          </button>
        </div>
        {monthQuickLabel ? (
          <p className="form-hint" style={{ width: '100%', margin: 0, fontSize: '0.875rem' }}>
            Showing {monthQuickLabel} (by created date).
          </p>
        ) : null}
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      {loading && invoices.length > 0 ? (
        <p className="form-hint" style={{ marginBottom: '0.75rem' }} role="status">
          Updating list…
        </p>
      ) : null}

      <div className="table-wrap card">
        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>🧾</div>
            <h3 className="empty-state-title">No invoices in this range</h3>
            <p className="empty-state-text">
              {dateFrom || dateTo
                ? 'Try clearing the date filters or pick another month.'
                : 'Create invoices from work orders or from scratch.'}
            </p>
            <Link to="/billing/new" className="btn btn-primary">
              New invoice
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Due date</th>
                <th>Amount ({currency})</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>{inv.number}</td>
                  <td>{invoiceCustomerLabel(inv)}</td>
                  <td>
                    <span className={`badge ${statusClass[inv.status] || 'badge-draft'}`}>
                      {inv.status || 'draft'}
                    </span>
                  </td>
                  <td>
                    {inv.createdAt
                      ? new Date(inv.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    {inv.total != null ? (
                      <>
                        {formatMoneyAmount(inv.total)} <span className="invoice-form-currency-suffix">{currency}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <ActionButtons
                      basePath="/billing"
                      id={inv._id}
                      onDownloadPdf={() => {
                        const w = window.open('about:blank', '_blank');
                        if (!w) {
                          setError('Could not open a new tab. Check your browser settings.');
                          return;
                        }
                        try {
                          w.document.write(
                            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;color:#64748b">Loading PDF…</body></html>'
                          );
                          w.document.close();
                        } catch {
                          /* ignore */
                        }
                        billingApi
                          .downloadInvoicePdf(inv._id, { targetWindow: w })
                          .catch((err) => {
                            try {
                              w.close();
                            } catch {
                              /* ignore */
                            }
                            setError(err.message || 'Failed to open PDF');
                          });
                      }}
                      onDelete={() =>
                        billingApi.deleteInvoice(inv._id)
                          .then(() => setInvoices((prev) => prev.filter((x) => x._id !== inv._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="invoice"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
