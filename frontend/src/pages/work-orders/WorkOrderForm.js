/**
 * Work order form: create new or edit existing.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as workOrdersApi from '../../api/workOrders';
import * as customersApi from '../../api/customers';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const initialItem = () => ({ name: '', quantity: '', unit: 'unit' });

export default function WorkOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    scheduledAt: '',
    items: [initialItem()],
  });

  useEffect(() => {
    customersApi
      .list()
      .then((res) => setCustomers(res.data?.data ?? res.data ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      workOrdersApi
        .get(id)
        .then((res) => {
          const data = res.data?.data ?? res.data ?? res;
          const cid = data.customerId;
          const customerIdStr =
            typeof cid === 'object' && cid?._id ? cid._id : cid ? String(cid) : '';
          setForm({
            customerId: customerIdStr,
            title: data.title ?? '',
            description: data.description ?? '',
            status: data.status ?? 'draft',
            priority: data.priority ?? 'medium',
            scheduledAt: data.scheduledAt ? data.scheduledAt.slice(0, 16) : '',
            items: Array.isArray(data.items) && data.items.length
              ? data.items.map((i) => ({
                  name: i.name ?? '',
                  quantity: i.quantity ?? '',
                  unit: i.unit ?? 'unit',
                }))
              : [initialItem()],
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load work order'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, initialItem()] }));
  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const buildPayload = () => {
    const payload = {
      title: form.title.trim(),
      customerId: form.customerId.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      items: form.items
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantity: Number(i.quantity) || 0,
          unit: i.unit || 'unit',
        })),
    };
    if (payload.items.length === 0) delete payload.items;
    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.customerId.trim()) {
      setError('Customer is required.');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const promise = isEdit ? workOrdersApi.update(id, payload) : workOrdersApi.create(payload);
    promise
      .then(() => navigate('/work-orders'))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save work order'))
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
        <h2 className="page-title">{isEdit ? 'Edit work order' : 'New work order'}</h2>
        <Link to="/work-orders" className="btn btn-secondary">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 640 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <h3 className="form-section-title">Details</h3>
          <div className="form-group">
            <label className="label" htmlFor="customerId">Customer *</label>
            <select
              id="customerId"
              className="input"
              value={form.customerId}
              onChange={(e) => update('customerId', e.target.value)}
              disabled={customersLoading || customers.length === 0}
              required
            >
              <option value="">{customersLoading ? 'Loading customers…' : 'Select a customer'}</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.email ? ` — ${c.email}` : ''}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="form-hint" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No customers yet.{' '}
                <Link to="/customers/new">Add a customer</Link> first.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              className="input"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Repair AC unit"
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Job details..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="status">Status</label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="priority">Priority</label>
              <select
                id="priority"
                className="input"
                value={form.priority}
                onChange={(e) => update('priority', e.target.value)}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="scheduledAt">Scheduled date & time</label>
              <input
                id="scheduledAt"
                type="datetime-local"
                className="input"
                value={form.scheduledAt}
                onChange={(e) => update('scheduledAt', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Items (optional)</h3>
          {form.items.map((item, index) => (
            <div key={index} className="repeatable-row">
              <div className="form-row" style={{ flex: 1, gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Qty"
                  min={0}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  style={{ width: 80 }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  style={{ width: 80 }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeItem(index)}
                disabled={form.items.length <= 1}
                aria-label="Remove item"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary repeatable-add" onClick={addItem}>
            + Add item
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create work order'}
          </button>
          <Link to="/work-orders" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
