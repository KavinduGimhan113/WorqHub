/**
 * Work Orders page. List and manage work orders.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as workOrdersApi from '../../api/workOrders';
import ActionButtons from '../../components/ActionButtons';

const statusClass = {
  draft: 'badge-draft',
  scheduled: 'badge-scheduled',
  in_progress: 'badge-in_progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    workOrdersApi
      .list()
      .then((res) => setOrders(res.data?.data ?? res.data ?? []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load work orders'))
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
        <h2 className="page-title">Work Orders</h2>
        <Link to="/work-orders/new" className="btn btn-primary">
          New work order
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Create and track jobs, schedule technicians, and update status.
      </p>

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
            <button type="button" className="btn btn-primary" disabled>
              New work order
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Customer</th>
                <th>Scheduled</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((wo) => (
                <tr key={wo._id}>
                  <td>{wo.title}</td>
                  <td>
                    <span className={`badge ${statusClass[wo.status] || 'badge-draft'}`}>
                      {wo.status?.replace('_', ' ') || 'draft'}
                    </span>
                  </td>
                  <td>{wo.priority || '—'}</td>
                  <td>{wo.customerId ? '—' : '—'}</td>
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
