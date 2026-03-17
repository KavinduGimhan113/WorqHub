/**
 * Inventory page. List and manage stock items.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as inventoryApi from '../../api/inventory';
import ActionButtons from '../../components/ActionButtons';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    inventoryApi
      .list()
      .then((res) => setItems(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setItems([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load inventory');
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
        <h2 className="page-title">Inventory</h2>
        <Link to="/inventory/new" className="btn btn-primary">
          Add item
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Track stock levels, SKUs, and reorder points.
      </p>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>📦</div>
            <h3 className="empty-state-title">No inventory items yet</h3>
            <p className="empty-state-text">Add items to track stock and link them to work orders.</p>
            <Link to="/inventory/new" className="btn btn-primary">
              Add item
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Min Qty</th>
                <th>Location</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit || 'unit'}</td>
                  <td>{item.minQuantity ?? '—'}</td>
                  <td>{item.location || '—'}</td>
                  <td>
                    <ActionButtons
                      basePath="/inventory"
                      id={item._id}
                      onDelete={() =>
                        inventoryApi.remove(item._id)
                          .then(() => setItems((prev) => prev.filter((x) => x._id !== item._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="item"
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
