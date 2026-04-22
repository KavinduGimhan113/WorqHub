/**
 * Work Orders page. List and manage work orders.
 */
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as workOrdersApi from '../../api/workOrders';
import * as customersApi from '../../api/customers';
import ActionButtons from '../../components/ActionButtons';

function formatWorkOrderDisplayId(wo) {
  const n = wo?.workOrderNumber != null ? Number(wo.workOrderNumber) : NaN;
  if (Number.isFinite(n) && n >= 1) {
    return String(Math.floor(n)).padStart(3, '0');
  }
  const id = wo?._id;
  if (id && typeof id === 'string') return `…${id.slice(-6)}`;
  if (id) return `…${String(id).slice(-6)}`;
  return '—';
}

const statusClass = {
  draft: 'badge-draft',
  scheduled: 'badge-scheduled',
  in_progress: 'badge-in_progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

/** Customer linked to the work order (who the job is for). */
function CustomerCell({ customerId, customersById }) {
  let c = null;
  if (customerId && typeof customerId === 'object' && customerId.name) {
    c = customerId;
  } else if (customerId && customersById?.size) {
    const key =
      typeof customerId === 'string'
        ? customerId
        : customerId && typeof customerId === 'object' && customerId._id != null
          ? String(customerId._id)
          : null;
    if (key) c = customersById.get(key) || null;
  }
  if (c && c.name) {
    return (
      <div className="table-customer-cell">
        <span className="table-customer-name">{c.name}</span>
        {c.email ? <span className="table-customer-meta">{c.email}</span> : null}
        {c.phone ? <span className="table-customer-meta">{c.phone}</span> : null}
      </div>
    );
  }
  return <span className="table-customer-missing">—</span>;
}

export default function WorkOrders() {
  const [searchParams] = useSearchParams();
  const employeeIdFilter = searchParams.get('employeeId') || '';
  const employeeNameFilter = searchParams.get('employeeName') || '';
  const [orders, setOrders] = useState([]);
  const [customersById, setCustomersById] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = employeeIdFilter ? { employeeId: employeeIdFilter } : undefined;
    Promise.all([workOrdersApi.list(params), customersApi.list().catch(() => ({ data: [] }))])
      .then(([woBody, custBody]) => {
        const rows = woBody?.data ?? woBody;
        setOrders(Array.isArray(rows) ? rows : []);
        const custList = custBody?.data ?? custBody;
        const list = Array.isArray(custList) ? custList : [];
        setCustomersById(new Map(list.map((x) => [String(x._id), x])));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load work orders'))
      .finally(() => setLoading(false));
  }, [employeeIdFilter]);

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
        <h2 className="page-title">Work Orders</h2>
        <Link to="/work-orders/new" className="btn btn-primary">
          New work order
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Create and track jobs, schedule technicians, and update status.
      </p>
      {employeeIdFilter && (
        <div className="form-success" role="status" style={{ marginBottom: '1rem' }}>
          Showing assigned work orders{employeeNameFilter ? ` for ${employeeNameFilter}` : ''}.{' '}
          <Link to="/work-orders">Clear filter</Link>
        </div>
      )}

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>📋</div>
            <h3 className="empty-state-title">No work orders yet</h3>
            <p className="empty-state-text">Create your first work order to start tracking jobs.</p>
            <Link to="/work-orders/new" className="btn btn-primary">
              New work order
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Customer</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Scheduled</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((wo) => (
                <tr key={wo._id}>
                  <td>
                    <span className="work-order-list-number" title={wo._id ? String(wo._id) : undefined}>
                      {formatWorkOrderDisplayId(wo)}
                    </span>
                  </td>
                  <td>{wo.title}</td>
                  <td>
                    <CustomerCell customerId={wo.customerId} customersById={customersById} />
                  </td>
                  <td>
                    {Array.isArray(wo.assignedEmployeeIds) && wo.assignedEmployeeIds.length > 0 ? (
                      <div className="work-order-list-assignees">
                        {wo.assignedEmployeeIds.map((e) => (
                          <span key={typeof e === 'object' && e?._id ? e._id : e} className="work-order-list-assignee-name">
                            {typeof e === 'object' && e?.name ? e.name : '—'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="table-customer-missing">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${statusClass[wo.status] || 'badge-draft'}`}>
                      {wo.status?.replace('_', ' ') || 'draft'}
                    </span>
                  </td>
                  <td>{wo.priority || '—'}</td>
                  <td>
                    {wo.scheduledAt
                      ? new Date(wo.scheduledAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <ActionButtons
                      basePath="/work-orders"
                      id={wo._id}
                      onDelete={() =>
                        workOrdersApi.remove(wo._id)
                          .then(() => setOrders((prev) => prev.filter((o) => o._id !== wo._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="work order"
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
