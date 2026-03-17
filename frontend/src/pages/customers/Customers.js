/**
 * Customers page. List and manage customers.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as customersApi from '../../api/customers';
import ActionButtons from '../../components/ActionButtons';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    customersApi
      .list()
      .then((res) => setCustomers(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setCustomers([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load customers');
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
        <h2 className="page-title">Customers</h2>
        <Link to="/customers/new" className="btn btn-primary">
          Add customer
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Manage customer contacts, addresses, and billing details.
      </p>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>👤</div>
            <h3 className="empty-state-title">No customers yet</h3>
            <p className="empty-state-text">Add customers to link them to work orders and invoices.</p>
            <Link to="/customers/new" className="btn btn-primary">
              Add customer
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.address ? `${c.address.slice(0, 40)}${c.address.length > 40 ? '…' : ''}` : '—'}</td>
                  <td>
                    <ActionButtons
                      basePath="/customers"
                      id={c._id}
                      onDelete={() =>
                        customersApi.remove(c._id)
                          .then(() => setCustomers((prev) => prev.filter((x) => x._id !== c._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="customer"
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
