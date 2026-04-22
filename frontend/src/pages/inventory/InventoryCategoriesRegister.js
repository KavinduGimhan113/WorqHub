/**
 * Register inventory categories — one user can add many categories (like a dedicated register page).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as inventoryApi from '../../api/inventory';
import { getApiErrorMessage } from '../../api/errors';

const DUPLICATE_CATEGORY_ALERT = 'This category already exists.';

function isDuplicateCategoryName(categories, nameTrimmed) {
  const lower = nameTrimmed.toLowerCase();
  return categories.some((c) => String(c?.name ?? '').trim().toLowerCase() === lower);
}

export default function InventoryCategoriesRegister() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCategories = useCallback(() => {
    return inventoryApi
      .listCategories()
      .then((body) => {
        const rows = body?.data ?? body;
        setCategories(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadCategories().finally(() => setLoading(false));
  }, [loadCategories]);

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a category name to register.');
      return;
    }
    if (isDuplicateCategoryName(categories, trimmed)) {
      setError(DUPLICATE_CATEGORY_ALERT);
      return;
    }
    setSaving(true);
    inventoryApi
      .createCategory(trimmed)
      .then(() => {
        setName('');
        setSuccess(`“${trimmed}” registered. You can add another below.`);
        return loadCategories();
      })
      .catch((err) => {
        const msg = getApiErrorMessage(err, 'Failed to register category');
        const status = err.response?.status;
        const looksLikeDuplicate =
          status === 400 &&
          /already|duplicate|same name|exists/i.test(msg);
        if (looksLikeDuplicate) {
          setError(DUPLICATE_CATEGORY_ALERT);
        } else {
          setError(msg);
        }
      })
      .finally(() => setSaving(false));
  };

  const handleRemove = (cat) => {
    if (!window.confirm(`Remove category “${cat.name}”?`)) return;
    setError('');
    setSuccess('');
    inventoryApi
      .removeCategory(cat._id)
      .then(() => {
        setSuccess(`“${cat.name}” removed.`);
        return loadCategories();
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to remove category')));
  };

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
        <h2 className="page-title">Category registration</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/inventory" className="btn btn-secondary">
            Back to inventory
          </Link>
          <Link to="/inventory/new" className="btn btn-primary">
            Add inventory item
          </Link>
        </div>
      </div>

      <div className="card card-body" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <h3 className="form-section-title" style={{ marginTop: 0 }}>New category</h3>
        <form onSubmit={handleRegister}>
          {error && (
            <div className="form-error" role="alert" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="form-success" role="status">
              {success}
            </div>
          )}
          <div className="form-group">
            <label className="label" htmlFor="categoryName">
              Category name *
            </label>
            <input
              id="categoryName"
              type="text"
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Raw materials, Tools, Consumables"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Registering…' : 'Register category'}
          </button>
        </form>
      </div>

      <div className="card card-body" style={{ maxWidth: 640 }}>
        <h3 className="form-section-title" style={{ marginTop: 0 }}>
          Your registered categories ({categories.length})
        </h3>
        {categories.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            No categories yet. Use the form above to register your first one.
          </p>
        ) : (
          <ul className="inventory-category-register-list">
            {categories.map((cat) => (
              <li key={cat._id} className="inventory-category-register-row">
                <span className="inventory-category-register-name">{cat.name}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleRemove(cat)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
