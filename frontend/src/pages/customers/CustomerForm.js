<<<<<<< Updated upstream
/**
 * Customer form: create new or edit existing.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as customersApi from '../../api/customers';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerCode: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    billingAddress: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      customersApi
        .get(id)
        .then((res) => {
          const data = res.data?.data ?? res.data ?? res;
          setForm({
            customerCode: data.customerCode ?? '',
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            address: data.address ?? '',
            billingAddress: data.billingAddress ?? '',
            notes: data.notes ?? '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load customer'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      billingAddress: form.billingAddress.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    const promise = isEdit ? customersApi.update(id, payload) : customersApi.create(payload);
    promise
      .then(() => navigate('/customers'))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save customer'))
      .finally(() => setSaving(false));
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
        <h2 className="page-title">{isEdit ? 'Edit customer' : 'New customer'}</h2>
        <Link to="/customers" className="btn btn-secondary">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 560 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <h3 className="form-section-title">Contact</h3>
          {isEdit && form.customerCode ? (
            <div className="form-group">
              <label className="label" htmlFor="customerCode">Customer ID</label>
              <input
                id="customerCode"
                type="text"
                className="input"
                value={form.customerCode}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
            </div>
          ) : null}
          <div className="form-group">
            <label className="label" htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Company or contact name"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Address</h3>
          <div className="form-group">
            <label className="label" htmlFor="address">Address</label>
            <textarea
              id="address"
              className="input"
              rows={2}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Street, city, postal code"
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="billingAddress">Billing address</label>
            <textarea
              id="billingAddress"
              className="input"
              rows={2}
              value={form.billingAddress}
              onChange={(e) => update('billingAddress', e.target.value)}
              placeholder="If different from address"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update customer' : 'Add customer'}
          </button>
          <Link to="/customers" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
=======
/**
 * Customer form: create new or edit existing.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as customersApi from '../../api/customers';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    billingAddress: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      customersApi
        .get(id)
        .then((res) => {
          const data = res.data?.data ?? res.data ?? res;
          setForm({
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            address: data.address ?? '',
            billingAddress: data.billingAddress ?? '',
            notes: data.notes ?? '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load customer'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      billingAddress: form.billingAddress.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    const promise = isEdit ? customersApi.update(id, payload) : customersApi.create(payload);
    promise
      .then(() => navigate('/customers'))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save customer'))
      .finally(() => setSaving(false));
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
        <h2 className="page-title">{isEdit ? 'Edit customer' : 'New customer'}</h2>
        <Link to="/customers" className="btn btn-secondary">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 560 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <h3 className="form-section-title">Contact</h3>
          <div className="form-group">
            <label className="label" htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Company or contact name"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Address</h3>
          <div className="form-group">
            <label className="label" htmlFor="address">Address</label>
            <textarea
              id="address"
              className="input"
              rows={2}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Street, city, postal code"
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="billingAddress">Billing address</label>
            <textarea
              id="billingAddress"
              className="input"
              rows={2}
              value={form.billingAddress}
              onChange={(e) => update('billingAddress', e.target.value)}
              placeholder="If different from address"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update customer' : 'Add customer'}
          </button>
          <Link to="/customers" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
>>>>>>> Stashed changes
