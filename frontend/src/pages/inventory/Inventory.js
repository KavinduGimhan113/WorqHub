/**
 * Inventory page. List stock items; categories are registered on a separate page.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as inventoryApi from '../../api/inventory';
import ActionButtons from '../../components/ActionButtons';

function loadItems(setItems, setError) {
  return inventoryApi
    .list()
    .then((body) => {
      const rows = body?.data ?? body;
      setItems(Array.isArray(rows) ? rows : []);
    })
    .catch((err) => {
      if (err.response?.status === 404) {
        setItems([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load inventory');
      }
    });
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    loadItems(setItems, setError).finally(() => setLoading(false));
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/inventory/categories/register" className="btn btn-secondary">
            Register categories
          </Link>
          <Link to="/inventory/new" className="btn btn-primary">
            Add item
          </Link>
        </div>
      </div>
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
                <th>Category</th>
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
                  <td>
                    {typeof item.categoryId === 'object' && item.categoryId?.name
                      ? item.categoryId.name
                      : '—'}
                  </td>
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
