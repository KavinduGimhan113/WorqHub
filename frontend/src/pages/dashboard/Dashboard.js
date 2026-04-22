<<<<<<< Updated upstream
/**
 * Dashboard with insights: charts, metrics, activity feed, orders.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import * as workOrdersApi from '../../api/workOrders';
import * as customersApi from '../../api/customers';
import * as billingApi from '../../api/billing';
import * as inventoryApi from '../../api/inventory';
import * as expensesApi from '../../api/expenses';
import { showExpensesInUi } from '../../config/features';

const LOW_STOCK_THRESHOLD = 10;

const COLORS = ['#F06021', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#d94e0f'];

const INVOICE_STATUS_CLASS = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-cancelled',
};

const INVOICE_STATUS_LABEL = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

function invoiceCustomerLabel(inv) {
  const c = inv?.customerId;
  if (c && typeof c === 'object' && c.name) return String(c.name).trim() || '—';
  return '—';
}

function yearMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Last `months` calendar months, paid invoice totals (LKR) per month. */
function buildMonthlyPaidRevenue(invoices, months = 7) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: yearMonthKey(d),
      month: d.toLocaleString('en-US', { month: 'short' }),
      paid: 0,
    });
  }
  const keySet = new Set(buckets.map((b) => b.key));
  for (const inv of invoices || []) {
    if (inv.status !== 'paid') continue;
    const raw = inv.paidAt || inv.updatedAt || inv.createdAt;
    if (!raw) continue;
    const dt = new Date(raw);
    const key = yearMonthKey(dt);
    if (!keySet.has(key)) continue;
    const b = buckets.find((x) => x.key === key);
    if (b) b.paid += Number(inv.total) || 0;
  }
  return buckets.map(({ month, paid }) => ({ month, paid }));
}

/** Count work orders per status for bar chart. */
function buildWorkOrderStatusBars(workOrders) {
  const order = [
    { status: 'draft', label: 'Draft' },
    { status: 'scheduled', label: 'Sched.' },
    { status: 'in_progress', label: 'Active' },
    { status: 'completed', label: 'Done' },
    { status: 'cancelled', label: 'Cancl.' },
  ];
  const list = Array.isArray(workOrders) ? workOrders : [];
  return order.map(({ status, label }) => ({
    name: label,
    value: list.filter((w) => w.status === status).length,
  }));
}

function formatInvoiceTableTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoneyLkr(n) {
  const x = Number(n) || 0;
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatWorkOrderNumber(wo) {
  const n = wo?.workOrderNumber != null ? Number(wo.workOrderNumber) : NaN;
  if (Number.isFinite(n) && n >= 1) return String(Math.floor(n)).padStart(3, '0');
  return null;
}

function assignedEmployeesLabel(assignedEmployeeIds) {
  const arr = Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : [];
  const names = arr
    .map((e) => (e && typeof e === 'object' && e.name ? String(e.name).trim() : null))
    .filter(Boolean);
  if (names.length === 0) return 'Unassigned';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function workOrderStatusLabel(status) {
  const m = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return m[status] || status || '—';
}

const WO_ACTIVITY_STATUS_CLASS = {
  draft: 'badge-draft',
  scheduled: 'badge-scheduled',
  in_progress: 'badge-in_progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

function formatActivityTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) {
    const aheadM = Math.floor(-diffMs / 60000);
    if (aheadM < 1) return 'Soon';
    if (aheadM < 60) return `in ${aheadM}m`;
    const aheadH = Math.floor(-diffMs / 3600000);
    if (aheadH < 24) return `in ${aheadH}h`;
    const aheadD = Math.floor(aheadH / 24);
    if (aheadD < 7) return `in ${aheadD}d`;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'Just now';
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildActivityFeedFromWorkOrders(workOrders, limit = 10) {
  const list = Array.isArray(workOrders) ? [...workOrders] : [];
  list.sort((a, b) => {
    const tb = new Date(b.updatedAt || b.createdAt).getTime();
    const ta = new Date(a.updatedAt || a.createdAt).getTime();
    return tb - ta;
  });
  return list.slice(0, limit).map((wo) => {
    const num = formatWorkOrderNumber(wo);
    const title = (wo.title && String(wo.title).trim()) || 'Work order';
    const desc = num ? `${num} · ${title}` : title;
    return {
      id: wo._id,
      employee: assignedEmployeesLabel(wo.assignedEmployeeIds),
      desc,
      status: wo.status,
      statusLabel: workOrderStatusLabel(wo.status),
      statusBadgeClass: WO_ACTIVITY_STATUS_CLASS[wo.status] || 'badge-draft',
      timeLabel: formatActivityTime(wo.updatedAt || wo.createdAt),
    };
  });
}

export default function Dashboard() {
  // eslint-disable-next-line no-unused-vars
  const { user, role } = useAuth();
  const [stats, setStats] = useState({
    workOrders: 0,
    customers: 0,
    invoices: 0,
    revenueBilled: 0,
    incomePaid: 0,
    outstanding: 0,
    billedCount: 0,
    paidCount: 0,
    unpaidCount: 0,
  });
  const [recentInvoiceRows, setRecentInvoiceRows] = useState([]);
  const [monthlyPaidChart, setMonthlyPaidChart] = useState([]);
  const [workOrderBarChart, setWorkOrderBarChart] = useState([]);
  const [lowStock, setLowStock] = useState({ count: 0, items: [], threshold: LOW_STOCK_THRESHOLD });
  const [lowStockError, setLowStockError] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState({
    totalAllTime: 0,
    totalThisMonth: 0,
    countAllTime: 0,
    countThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  /** Secondary fetches (low stock, expenses) — don’t block charts / main stats after login. */
  const [auxLoading, setAuxLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [woRes, custRes, invRes] = await Promise.all([
          workOrdersApi.list({ limit: 50, order: 'recent' }).catch(() => ({ data: [] })),
          customersApi.list().catch(() => ({ data: [] })),
          billingApi.listInvoices().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const workOrders = Array.isArray(woRes?.data) ? woRes.data : woRes?.data?.data ?? [];
        const workOrderListTotal =
          typeof woRes?.total === 'number' ? woRes.total : Array.isArray(workOrders) ? workOrders.length : 0;
        const customers = custRes.data?.data ?? custRes.data ?? [];
        const invoices = invRes.data?.data ?? invRes.data ?? [];
        const nonCancelled = invoices.filter((inv) => inv.status !== 'cancelled');
        const revenueBilled = nonCancelled.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
        const incomePaid = paidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const unpaid = nonCancelled.filter((inv) => inv.status !== 'paid');
        const outstanding = unpaid.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        setActivityFeed(buildActivityFeedFromWorkOrders(workOrders, 10));
        setMonthlyPaidChart(buildMonthlyPaidRevenue(invoices, 7));
        setWorkOrderBarChart(buildWorkOrderStatusBars(workOrders));
        setStats({
          workOrders: workOrderListTotal,
          customers: customers.length,
          invoices: invoices.length,
          revenueBilled,
          incomePaid,
          outstanding,
          billedCount: nonCancelled.length,
          paidCount: paidInvoices.length,
          unpaidCount: unpaid.length,
        });
        const invSorted = [...invoices].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setRecentInvoiceRows(
          invSorted.slice(0, 8).map((inv) => ({
            id: inv._id,
            number: inv.number || '—',
            customer: invoiceCustomerLabel(inv),
            amount: inv.total != null ? formatMoneyLkr(inv.total) : '—',
            time: formatInvoiceTableTime(inv.createdAt),
            status: inv.status || 'draft',
            statusLabel: INVOICE_STATUS_LABEL[inv.status] || inv.status || '—',
            badgeClass: INVOICE_STATUS_CLASS[inv.status] || 'badge-draft',
          }))
        );

        setLoading(false);

        const [lowRes, exSumRes] = await Promise.all([
          inventoryApi.lowStock({ threshold: LOW_STOCK_THRESHOLD, limit: 15 }).catch(() => ({ _failed: true })),
          showExpensesInUi ? expensesApi.summary().catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (lowRes?._failed) {
          setLowStockError(true);
        } else {
          setLowStockError(false);
          const lowPayload = lowRes?.data ?? lowRes;
          if (lowPayload && typeof lowPayload.count === 'number') {
            setLowStock({
              count: lowPayload.count,
              items: Array.isArray(lowPayload.items) ? lowPayload.items : [],
              threshold: lowPayload.threshold ?? LOW_STOCK_THRESHOLD,
            });
          }
        }

        if (showExpensesInUi) {
          const exInner = exSumRes?.data;
          if (exInner && typeof exInner.totalAllTime === 'number') {
            setExpenseSummary({
              totalAllTime: exInner.totalAllTime,
              totalThisMonth: exInner.totalThisMonth,
              countAllTime: exInner.countAllTime,
              countThisMonth: exInner.countThisMonth,
            });
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setAuxLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = () => {
    const lines = [
      ['Month', 'Paid revenue (LKR)'].join(','),
      ...monthlyPaidChart.map((d) => [d.month, d.paid].join(',')),
      '',
      ['Work order status', 'Count'].join(','),
      ...workOrderBarChart.map((d) => [d.name, d.value].join(',')),
    ];
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-chart-card">
          <h3 className="dashboard-card-title">Monthly paid revenue</h3>
          <p className="dashboard-chart-subtitle">Paid invoices total by calendar month (LKR)</p>
          <div className="dashboard-chart">
            {loading ? (
              <div className="dashboard-chart-empty">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyPaidChart} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    width={52}
                    tickFormatter={(v) => (Number(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                  />
                  <Tooltip formatter={(v) => [`${formatMoneyLkr(v)} LKR`, 'Paid']} />
                  <Line
                    type="monotone"
                    dataKey="paid"
                    name="Paid"
                    stroke="#F06021"
                    strokeWidth={3}
                    dot={{ fill: '#F06021', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="dashboard-card-title" style={{ marginBottom: '0.25rem' }}>
                Work orders by status
              </h3>
              <p className="dashboard-chart-subtitle" style={{ margin: 0 }}>
                Counts from your latest work order list (up to 50 loaded)
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-export" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export data
            </button>
          </div>
          <div className="dashboard-chart">
            {loading ? (
              <div className="dashboard-chart-empty">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={workOrderBarChart} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" width={36} />
                  <Tooltip formatter={(v) => [v, 'Work orders']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {workOrderBarChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div
          className={`dashboard-finance-row${showExpensesInUi ? '' : ' dashboard-finance-row--two'}`}
          role="region"
          aria-label="Financial summary"
        >
          <div className="dashboard-card dashboard-revenue-card">
            <div className="dashboard-revenue-header">
              <span className="dashboard-revenue-label">Revenue</span>
              <span className="dashboard-revenue-badge">
                {loading
                  ? '—'
                  : stats.billedCount > 0
                    ? `${stats.billedCount} billed`
                    : 'No invoices'}
              </span>
            </div>
            <p className="dashboard-revenue-hint">Total invoiced (excl. cancelled)</p>
            <div className="dashboard-revenue-value">
              {loading ? '—' : formatMoneyLkr(stats.revenueBilled)}
              <span className="dashboard-revenue-currency"> LKR</span>
            </div>
          </div>
          <div className="dashboard-card dashboard-revenue-card">
            <div className="dashboard-revenue-header">
              <span className="dashboard-revenue-label">Income</span>
              <span className="dashboard-revenue-badge">
                {loading
                  ? '—'
                  : stats.revenueBilled > 0
                    ? `${Math.round((stats.incomePaid / stats.revenueBilled) * 100)}% collected`
                    : stats.paidCount > 0
                      ? 'Paid'
                      : '—'}
              </span>
            </div>
            <p className="dashboard-revenue-hint">Cash received (paid invoices)</p>
            <div className="dashboard-revenue-value">
              {loading ? '—' : formatMoneyLkr(stats.incomePaid)}
              <span className="dashboard-revenue-currency"> LKR</span>
            </div>
            {!loading && (
              <p className="dashboard-revenue-sub">
                Outstanding: {formatMoneyLkr(stats.outstanding)} LKR
                {stats.unpaidCount > 0 ? ` · ${stats.unpaidCount} open` : ''}
              </p>
            )}
          </div>
          {showExpensesInUi && (
            <div className="dashboard-card dashboard-revenue-card dashboard-revenue-card--expenses">
              <div className="dashboard-revenue-header">
                <span className="dashboard-revenue-label">Expenses</span>
                <span className="dashboard-revenue-badge">
                  {loading || auxLoading
                    ? '—'
                    : expenseSummary.countAllTime > 0
                      ? `${expenseSummary.countAllTime} recorded`
                      : 'None yet'}
                </span>
              </div>
              <p className="dashboard-revenue-hint">Recorded expenses (all time)</p>
              <div className="dashboard-revenue-value">
                {loading || auxLoading ? '—' : formatMoneyLkr(expenseSummary.totalAllTime)}
                <span className="dashboard-revenue-currency"> LKR</span>
              </div>
              {!loading && !auxLoading && expenseSummary.countThisMonth > 0 && (
                <p className="dashboard-revenue-sub">
                  This month: {formatMoneyLkr(expenseSummary.totalThisMonth)} LKR
                </p>
              )}
              {!loading && !auxLoading && (
                <Link to="/expenses" className="dashboard-expenses-link">
                  Manage expenses
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-card dashboard-stack-card">
          <div className="dashboard-stack-card-section">
            <h3 className="dashboard-stack-card-heading">Inventory</h3>
            {(loading || auxLoading) && (
              <p className="dashboard-stock-placeholder">Checking stock levels…</p>
            )}
            {!loading && !auxLoading && lowStockError && (
              <p className="dashboard-stock-placeholder dashboard-stock-placeholder--warn" role="status">
                Could not load inventory. Try again or open Inventory.
              </p>
            )}
            {!loading && !auxLoading && !lowStockError && lowStock.count > 0 && (
              <div className="dashboard-low-stock-inline" role="alert">
                <div className="dashboard-low-stock-inline-header">
                  <span className="dashboard-low-stock-inline-icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <strong className="dashboard-low-stock-inline-title">Low stock</strong>
                </div>
                <p className="dashboard-low-stock-inline-text">
                  {lowStock.count === 1
                    ? `1 item under ${lowStock.threshold} units.`
                    : `${lowStock.count} items under ${lowStock.threshold} units.`}
                </p>
                <ul className="dashboard-low-stock-inline-list">
                  {lowStock.items.map((row) => (
                    <li key={row._id}>
                      <span className="dashboard-low-stock-name">{row.name}</span>
                      <span className="dashboard-low-stock-meta">
                        {row.sku ? `${row.sku} · ` : ''}
                        {row.quantity == null ? 0 : Number(row.quantity)} in stock
                      </span>
                    </li>
                  ))}
                </ul>
                {lowStock.count > lowStock.items.length && (
                  <p className="dashboard-low-stock-more">
                    +{lowStock.count - lowStock.items.length} more
                  </p>
                )}
                <Link to="/inventory" className="dashboard-low-stock-link">
                  Manage inventory
                </Link>
              </div>
            )}
            {!loading && !auxLoading && !lowStockError && lowStock.count === 0 && (
              <div className="dashboard-stock-ok" role="status">
                <span className="dashboard-stock-ok-title">Stock levels OK</span>
                <p className="dashboard-stock-ok-text">
                  No items below {LOW_STOCK_THRESHOLD} units.
                </p>
                <Link to="/inventory" className="dashboard-low-stock-link dashboard-stock-ok-link">
                  View inventory
                </Link>
              </div>
            )}
          </div>
          <div className="dashboard-stack-card-divider" />
          <Link to="/work-orders/new" className="dashboard-new-task dashboard-new-task--stacked">
            <span className="dashboard-new-task-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <div className="dashboard-new-task-content">
              <span className="dashboard-new-task-label">New task</span>
              <span className="dashboard-new-task-hint">Create a work order</span>
            </div>
          </Link>
        </div>

        <div className="dashboard-card dashboard-table-card dashboard-activity-feed-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Recent Activity Feed</h3>
            <Link to="/work-orders" className="dashboard-view-all">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Desc</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activityFeed.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                      No work orders yet.{' '}
                      <Link to="/work-orders/new">Create a work order</Link> to see activity here.
                    </td>
                  </tr>
                ) : (
                  activityFeed.map((row) => (
                    <tr key={row.id}>
                      <td>{row.employee}</td>
                      <td>
                        {row.id ? (
                          <Link to={`/work-orders/${row.id}/edit`} className="dashboard-activity-desc-link">
                            {row.desc}
                          </Link>
                        ) : (
                          row.desc
                        )}
                      </td>
                      <td>
                        <span className={`badge ${row.statusBadgeClass}`}>{row.statusLabel}</span>
                      </td>
                      <td>{row.timeLabel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card dashboard-table-card dashboard-recent-invoices-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Recent invoices</h3>
            <Link to="/billing" className="dashboard-view-all">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                      No invoices yet.{' '}
                      <Link to="/billing/new">Create an invoice</Link> to see it here.
                    </td>
                  </tr>
                ) : (
                  recentInvoiceRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/billing/${row.id}/edit`} className="dashboard-activity-desc-link">
                          {row.customer}
                        </Link>
                      </td>
                      <td>
                        <span className="dashboard-invoice-number">{row.number}</span>
                      </td>
                      <td>
                        {row.amount} LKR
                      </td>
                      <td>{row.time}</td>
                      <td>
                        <span className={`badge ${row.badgeClass}`}>{row.statusLabel}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
=======
/**
 * Dashboard with insights: charts, metrics, activity feed, orders.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import * as workOrdersApi from '../../api/workOrders';
import * as customersApi from '../../api/customers';
import * as billingApi from '../../api/billing';

const revenueExpenseData = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 19 },
  { month: 'Mar', value: 28 },
  { month: 'Apr', value: 22 },
  { month: 'May', value: 30 },
  { month: 'Jun', value: 26 },
  { month: 'Jul', value: 30 },
];

const ordersData = [
  { name: '1', value: 15 },
  { name: '2', value: 28 },
  { name: '3', value: 22 },
  { name: '4', value: 35 },
  { name: '5', value: 18 },
  { name: '6', value: 32 },
  { name: '7', value: 25 },
];

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#dc2626'];

const activityData = [
  { emp: 'Emp 1', desc: 'Lorem ipsum dolor', status: 'Pending', time: '1:54 PM' },
  { emp: 'Emp 2', desc: 'Lorem ipsum dolor', status: 'Completed', time: '12:11 PM' },
  { emp: 'Emp 3', desc: 'Lorem ipsum dolor', status: 'Pending', time: 'Yesterday at 6:21 PM' },
  { emp: 'Emp 4', desc: 'Lorem ipsum dolor', status: 'Completed', time: '20 Feb at 1:54 PM' },
];

export default function Dashboard() {
  // eslint-disable-next-line no-unused-vars
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ workOrders: 0, customers: 0, invoices: 0, totalRevenue: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      workOrdersApi.list().catch(() => ({ data: [] })),
      customersApi.list().catch(() => ({ data: [] })),
      billingApi.listInvoices().catch(() => ({ data: [] })),
    ]).then(([woRes, custRes, invRes]) => {
      const orders = woRes.data?.data ?? woRes.data ?? [];
      const customers = custRes.data?.data ?? custRes.data ?? [];
      const invoices = invRes.data?.data ?? invRes.data ?? [];
      const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      setStats({
        workOrders: orders.length,
        customers: customers.length,
        invoices: invoices.length,
        totalRevenue,
      });
      const orderRows = invoices.slice(0, 5).map((inv, i) => ({
        name: `C${i + 1}`,
        amount: inv.total != null ? `Rs. ${Number(inv.total).toFixed(0)}/=` : '—',
        time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        status: inv.status === 'paid' ? 'Completed' : 'Pending',
      }));
      setRecentOrders(orderRows.length > 0 ? orderRows : [
        { name: 'C1', amount: 'Rs. 1507/=', time: '1:57 PM', status: 'Completed' },
        { name: 'C5', amount: 'Rs. 2504/=', time: '1:57 PM', status: 'Pending' },
        { name: 'C6', amount: 'Rs. 1802/=', time: '1:57 PM', status: 'Completed' },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    const csv = [
      ['Month', 'Revenue/Expense'].join(','),
      ...revenueExpenseData.map((d) => [d.month, d.value].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-chart-card">
          <h3 className="dashboard-card-title">Monthly Revenue vs Expenses</h3>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueExpenseData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[10, 30]} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={3} dot={{ fill: '#dc2626', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Total Orders</h3>
            <button type="button" className="btn btn-primary btn-export" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export data
            </button>
          </div>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[10, 40]} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {ordersData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Link to="/work-orders/new" className="dashboard-card dashboard-new-task">
          <span className="dashboard-new-task-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <div className="dashboard-new-task-content">
            <span className="dashboard-new-task-label">New task</span>
            <span className="dashboard-new-task-hint">Create a work order</span>
          </div>
        </Link>

        <div className="dashboard-card dashboard-revenue-card">
          <div className="dashboard-revenue-header">
            <span className="dashboard-revenue-label">Total Revenue</span>
            <span className="dashboard-revenue-badge">+18.7%</span>
          </div>
          <div className="dashboard-revenue-value">
            {loading ? '—' : stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : '135,200'}
            <span className="dashboard-revenue-currency"> LKR</span>
          </div>
        </div>

        <div className="dashboard-card dashboard-table-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Recent Activity Feed</h3>
            <Link to="/work-orders" className="dashboard-view-all">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Desc</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activityData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.emp}</td>
                    <td>{row.desc}</td>
                    <td>
                      <span className={`badge ${row.status === 'Completed' ? 'badge-completed' : 'badge-in_progress'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card dashboard-table-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Orders</h3>
            <Link to="/billing" className="dashboard-view-all">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.amount}</td>
                    <td>{row.time}</td>
                    <td>
                      <span className={`badge ${row.status === 'Completed' ? 'badge-completed' : 'badge-in_progress'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> Stashed changes
