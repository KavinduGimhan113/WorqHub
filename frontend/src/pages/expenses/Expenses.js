/**
 * Expenses list — record operational costs (LKR).
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as expensesApi from '../../api/expenses';
import ActionButtons from '../../components/ActionButtons';

const CATEGORY_LABEL = {
  supplies: 'Supplies',
  travel: 'Travel',
  payroll: 'Payroll',
  utilities: 'Utilities',
  equipment: 'Equipment',
  rent: 'Rent',
  other: 'Other',
};

function formatMoneyLkr(n) {
  const x = Number(n) || 0;
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatExpenseDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    expensesApi
      .list()
      .then((res) => setItems(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setItems([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load expenses');
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
        <h2 className="page-title">Expenses</h2>
        <Link to="/expenses/new" className="btn btn-primary">
          Record expense
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Track vendor payments, payroll, supplies, and other costs in LKR.
      </p>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>
              📒
            </div>
            <h3 className="empty-state-title">No expenses yet</h3>
            <p className="empty-state-text">Add your first expense to see it in reports and on the dashboard.</p>
            <Link to="/expenses/new" className="btn btn-primary">
              Record expense
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Vendor</th>
                <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td>{formatExpenseDate(row.expenseDate)}</td>
                  <td>{row.description?.trim() || '—'}</td>
                  <td>{CATEGORY_LABEL[row.category] || row.category || '—'}</td>
                  <td>{row.vendor?.trim() || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatMoneyLkr(row.amount)}
                  </td>
                  <td>
                    <ActionButtons
                      basePath="/expenses"
                      id={row._id}
                      onDelete={() =>
                        expensesApi
                          .remove(row._id)
                          .then(() => setItems((prev) => prev.filter((x) => x._id !== row._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="expense"
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
