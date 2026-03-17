/**
 * Invoice form: create or edit invoice.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import * as billingApi from '../../api/billing';
import * as customersApi from '../../api/customers';

const initialLineItem = () => ({ description: '', quantity: 1, unitPrice: 0 });

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    number: '',
    customerId: '',
    dueDate: '',
    status: 'draft',
    lineItems: [initialLineItem()],
  });

  useEffect(() => {
    customersApi
      .list()
      .then((res) => setCustomers(res.data?.data ?? res.data ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, []);

  useEffect(() => {
    if (!id) return;
    billingApi
      .getInvoice(id)
      .then((res) => {
        const inv = res.data ?? res;
        const lineItems = (inv.lineItems && inv.lineItems.length > 0)
          ? inv.lineItems.map((i) => ({
              description: i.description || '',
              quantity: i.quantity ?? 1,
              unitPrice: i.unitPrice ?? 0,
            }))
          : [initialLineItem()];
        setForm({
          number: inv.number || '',
          customerId: inv.customerId ? String(inv.customerId) : '',
          dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
          status: inv.status || 'draft',
          lineItems,
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoadingInvoice(false));
  }, [id]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateLineItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, initialLineItem()] }));
  const removeLineItem = (index) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const subtotal = form.lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const buildPayload = () => {
    const lineItems = form.lineItems
      .filter((i) => i.description.trim())
      .map((i) => {
        const qty = Number(i.quantity) || 0;
        const price = Number(i.unitPrice) || 0;
        return {
          description: i.description.trim(),
          quantity: qty,
          unitPrice: price,
          amount: qty * price,
        };
      });
    return {
      number: form.number.trim(),
      customerId: form.customerId || undefined,
      status: form.status,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      lineItems,
      subtotal,
      tax: 0,
      total: subtotal,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.number.trim()) {
      setError('Invoice number is required.');
      return;
    }
    const validItems = form.lineItems.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError('Add at least one line item with a description.');
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const promise = isEdit ? billingApi.updateInvoice(id, payload) : billingApi.createInvoice(payload);
    promise
      .then(() => navigate('/billing'))
      .catch((err) => setError(err.response?.data?.message || (isEdit ? 'Failed to update invoice' : 'Failed to create invoice')))
      .finally(() => setSaving(false));
  };

  if (loadingInvoice) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">{isEdit ? 'Edit invoice' : 'New invoice'}</h2>
        <Link to="/billing" className="btn btn-secondary">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 680 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <h3 className="form-section-title">Invoice details</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="number">Invoice number *</label>
              <input
                id="number"
                type="text"
                className="input"
                value={form.number}
                onChange={(e) => update('number', e.target.value)}
                placeholder="e.g. INV-2024-001"
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="customerId">Customer</label>
              <select
                id="customerId"
                className="input"
                value={form.customerId}
                onChange={(e) => update('customerId', e.target.value)}
                disabled={loadingCustomers}
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="dueDate">Due date</label>
              <input
                id="dueDate"
                type="date"
                className="input"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="status">Status</label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Line items</h3>
          {form.lineItems.map((item, index) => (
            <div key={index} className="repeatable-row">
              <div className="form-row" style={{ flex: 1, gap: '0.5rem', alignItems: 'end' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  style={{ minWidth: 160 }}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Qty"
                  min={0}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  style={{ width: 80 }}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Unit price"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  = {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeLineItem(index)}
                disabled={form.lineItems.length <= 1}
                aria-label="Remove line"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary repeatable-add" onClick={addLineItem}>
            + Add line item
          </button>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Subtotal: ${subtotal.toFixed(2)}
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save invoice' : 'Create invoice')}
          </button>
          <Link to="/billing" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
