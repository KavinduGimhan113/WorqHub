/**
 * Billing page. List and manage invoices.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as billingApi from '../../api/billing';
import ActionButtons from '../../components/ActionButtons';

const statusClass = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-cancelled',
};

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    billingApi
      .listInvoices()
      .then((res) => setInvoices(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setInvoices([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load invoices');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>🧾</div>
            <h3 className="empty-state-title">No invoices yet</h3>
            <p className="empty-state-text">Create invoices from work orders or from scratch.</p>
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
                <th>Due date</th>
                <th>Amount</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>{inv.number}</td>
                  <td>{inv.customerId ? '—' : '—'}</td>
                  <td>
                    <span className={`badge ${statusClass[inv.status] || 'badge-draft'}`}>
                      {inv.status || 'draft'}
                    </span>
                  </td>
                  <td>
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>{inv.total != null ? `$${Number(inv.total).toFixed(2)}` : '—'}</td>
                  <td>
                    <ActionButtons
                      basePath="/billing"
                      id={inv._id}
                      onDownloadPdf={() =>
                        billingApi
                          .downloadInvoicePdf(inv._id)
                          .catch((err) => setError(err.message || 'Failed to download PDF'))
                      }
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
