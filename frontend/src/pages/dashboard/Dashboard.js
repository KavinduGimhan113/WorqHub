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

const COLORS = ['#F06021', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#d94e0f'];

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
                <Line type="monotone" dataKey="value" stroke="#F06021" strokeWidth={3} dot={{ fill: '#F06021', r: 4 }} />
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
