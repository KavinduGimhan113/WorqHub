
/**
 * Reports page. Summaries from tenant-scoped DB aggregates + Excel export per metric.
 */
import React, { useState, useEffect } from 'react';
import * as reportsApi from '../../api/reports';
import { getApiErrorMessage } from '../../api/errors';

const WO_STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatMonthRange(isoStart) {
  if (!isoStart) return '';
  const d = new Date(isoStart);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function ReportStatCard({ label, value, dataset }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const onDownload = () => {
    setLocalError(null);
    setBusy(true);
    reportsApi
      .downloadReportExcel(dataset)
      .catch((err) => {
        setLocalError(getApiErrorMessage(err, 'Download failed'));
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="stat-card card report-stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {localError && (
        <p className="report-stat-error" role="alert">
          {localError}
        </p>
      )}
      <button
        type="button"
        className="btn btn-secondary report-stat-download"
        onClick={onDownload}
        disabled={busy}
      >
        {busy ? 'Preparing…' : 'Download Excel'}
      </button>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [woStats, setWoStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([reportsApi.dashboard(), reportsApi.workOrderStats()])
      .then((outcomes) => {
        if (cancelled) return;
        const [dashOutcome, woOutcome] = outcomes;
        if (dashOutcome.status === 'fulfilled') {
          const r = dashOutcome.value;
          setSummary(r?.data ?? r ?? null);
        }
        if (woOutcome.status === 'fulfilled') {
          const r = woOutcome.value;
          setWoStats(r?.data ?? r ?? null);
        }
        const parts = [];
        if (dashOutcome.status === 'rejected') {
          parts.push(getApiErrorMessage(dashOutcome.reason, 'Could not load dashboard metrics.'));
        }
        if (woOutcome.status === 'rejected') {
          parts.push(getApiErrorMessage(woOutcome.reason, 'Could not load work order breakdown.'));
        }
        setError(parts.length ? [...new Set(parts)].join(' ') : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  const monthLabel = formatMonthRange(summary?.monthStart);

  return (
    <>
      <h2 className="page-title">Reports</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Live totals from your organization&apos;s data{monthLabel ? ` · ${monthLabel} (UTC)` : ''}. Use
        &quot;Download Excel&quot; on each card for a spreadsheet of the underlying rows.
      </p>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <ReportStatCard
          label="Work orders (this month)"
          value={summary?.workOrdersThisMonth ?? '—'}
          dataset="work-orders-this-month"
        />
        <ReportStatCard
          label="Revenue (this month, paid)"
          value={
            summary?.revenueThisMonth != null ? `$${Number(summary.revenueThisMonth).toFixed(0)}` : '—'
          }
          dataset="revenue-this-month"
        />
        <ReportStatCard
          label="Open invoices"
          value={summary?.openInvoices ?? '—'}
          dataset="open-invoices"
        />
        <ReportStatCard
          label="Work orders (all time)"
          value={summary?.workOrdersTotal ?? '—'}
          dataset="work-orders-all"
        />
        <ReportStatCard
          label="Customers"
          value={summary?.customersCount ?? '—'}
          dataset="customers"
        />
        <ReportStatCard
          label="Inventory items"
          value={summary?.inventoryCount ?? '—'}
          dataset="inventory"
        />
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Work orders by status
          </h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Counts across all work orders in your tenant (not filtered by month).
            {woStats?.total != null ? ` Total: ${woStats.total}.` : ''}
          </p>
          {woStats?.byStatus?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', width: '8rem' }}>
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {woStats.byStatus.map((row) => (
                    <tr key={row.status}>
                      <td>{WO_STATUS_LABELS[row.status] || row.status}</td>
                      <td style={{ textAlign: 'right' }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              No work orders yet. Create work orders to see a breakdown here.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
