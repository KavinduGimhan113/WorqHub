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

const DASHBOARD_QUICK_ACTIONS = [
  { to: '/work-orders/new', label: 'New work order', icon: 'clipboard' },
  { to: '/billing/new', label: 'New invoice', icon: 'dollar' },
  { to: '/customers/new', label: 'New customer', icon: 'users' },
  { to: '/inventory/new', label: 'Add inventory', icon: 'box' },
  { to: '/employees/new', label: 'New employee', icon: 'briefcase' },
  { to: '/work-orders', label: 'All work orders', icon: 'list' },
  { to: '/customers', label: 'Customers', icon: 'users-list' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function QuickActionIcon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    'aria-hidden': true,
  };
  switch (name) {
    case 'clipboard':
      return (
        <svg {...common}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case 'dollar':
      return (
        <svg {...common}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'users-list':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="23" y2="8" />
          <line x1="19" y1="12" x2="23" y2="12" />
          <line x1="19" y1="16" x2="23" y2="16" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      workOrdersApi.list({ limit: 50 }).catch(() => ({ data: [] })),
      customersApi.list().catch(() => ({ data: [] })),
      billingApi.listInvoices().catch(() => ({ data: [] })),
      inventoryApi.lowStock({ threshold: LOW_STOCK_THRESHOLD, limit: 15 }).catch(() => ({ _failed: true })),
    ]).then(([woRes, custRes, invRes, lowRes]) => {
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
    }).finally(() => setLoading(false));
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

        <div className="dashboard-finance-row" role="region" aria-label="Financial summary">
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
          <div className="dashboard-card dashboard-revenue-card dashboard-revenue-card--expenses">
            <div className="dashboard-revenue-header">
              <span className="dashboard-revenue-label">Expenses</span>
              <span className="dashboard-revenue-badge dashboard-revenue-badge--muted">Not tracked</span>
            </div>
            <p className="dashboard-revenue-hint">Vendor, payroll, and other costs (add a ledger later)</p>
            <div className="dashboard-revenue-value">
              {loading ? '—' : formatMoneyLkr(0)}
              <span className="dashboard-revenue-currency"> LKR</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card dashboard-stack-card">
          <div className="dashboard-stack-card-section">
            <h3 className="dashboard-stack-card-heading">Inventory</h3>
            {loading && (
              <p className="dashboard-stock-placeholder">Checking stock levels…</p>
            )}
            {!loading && lowStockError && (
              <p className="dashboard-stock-placeholder dashboard-stock-placeholder--warn" role="status">
                Could not load inventory. Try again or open Inventory.
              </p>
            )}
            {!loading && !lowStockError && lowStock.count > 0 && (
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
                        {row.quantity == null ? 0 : Number(row.quantity)} {row.unit || 'unit'}
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
            {!loading && !lowStockError && lowStock.count === 0 && (
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

        <div
          className="dashboard-card dashboard-quick-actions"
          role="navigation"
          aria-label="Quick actions"
        >
          <div className="dashboard-quick-actions-head">
            <h3 className="dashboard-card-title">Quick actions</h3>
            <p className="dashboard-chart-subtitle dashboard-quick-actions-sub">Jump to common tasks</p>
          </div>
          <ul className="dashboard-quick-actions-grid">
            {DASHBOARD_QUICK_ACTIONS.map((a) => (
              <li key={a.to}>
                <Link to={a.to} className="dashboard-quick-action">
                  <span className="dashboard-quick-action-icon">
                    <QuickActionIcon name={a.icon} />
                  </span>
                  <span className="dashboard-quick-action-label">{a.label}</span>
                </Link>
              </li>
            ))}
          </ul>
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
