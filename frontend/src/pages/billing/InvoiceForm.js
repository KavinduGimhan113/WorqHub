/**
 * Invoice form: create or edit — layout aligned with invoice PDF / WorqHub brand.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import * as billingApi from '../../api/billing';
import * as customersApi from '../../api/customers';
import * as workOrdersApi from '../../api/workOrders';
import { useAuth } from '../../context/AuthContext';

const initialLineItem = () => ({ description: '', quantity: 1, unitPrice: 0 });

function fmtUs(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function paymentTermsLabel(issued, dueStr) {
  if (!dueStr) return 'Per agreement';
  try {
    const i = new Date(issued).setHours(0, 0, 0, 0);
    const d = new Date(dueStr).setHours(0, 0, 0, 0);
    const days = Math.round((d - i) / 86400000);
    if (!Number.isFinite(days)) return 'Per agreement';
    if (days <= 0) return 'Due on receipt';
    return `Net ${days}`;
  } catch {
    return 'Per agreement';
  }
}

function formatMoneyLkr(n) {
  const x = Number(n) || 0;
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Same rule as backend `invoiceController.lineItemRowTotal`. */
function lineItemRowTotal(item) {
  if (item.amount != null && Number.isFinite(Number(item.amount))) return Number(item.amount);
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

/** Subtotal: sum of raw line totals, then one round — matches `normalizeInvoiceTotals` on the server. */
function subtotalFromBilledLineItems(billedItems) {
  return roundMoney(billedItems.reduce((sum, item) => sum + lineItemRowTotal(item), 0));
}

function formatBillPreview(c) {
  if (!c) return null;
  const parts = [];
  const addr = c.billingAddress || c.address;
  if (addr) parts.push(String(addr));
  const contact = [c.email, c.phone].filter(Boolean).join('  |  ');
  if (contact) parts.push(contact);
  return parts.length ? parts.join('\n') : null;
}

function workOrderDisplayNumber(wo) {
  const n = wo?.workOrderNumber != null ? Number(wo.workOrderNumber) : NaN;
  if (Number.isFinite(n) && n >= 1) return String(Math.floor(n)).padStart(3, '0');
  return null;
}

/** Roll up `items[]` from work orders (name, quantity) for the selected customer. */
function aggregateCustomerWorkOrderItems(workOrders) {
  const map = new Map();
  for (const wo of workOrders || []) {
    const woLabel = workOrderDisplayNumber(wo);
    const woTitle = (wo.title && String(wo.title).trim()) || '';
    const ref = woLabel ? `#${woLabel}${woTitle ? ` · ${woTitle}` : ''}` : woTitle || 'Work order';
    for (const it of wo.items || []) {
      const name = (it.name && String(it.name).trim()) || 'Item';
      const qty = Number(it.quantity) || 0;
      const key = name;
      const prev = map.get(key) || {
        name,
        quantity: 0,
        workOrderRefs: [],
      };
      prev.quantity += qty;
      if (ref && !prev.workOrderRefs.includes(ref)) prev.workOrderRefs.push(ref);
      map.set(key, prev);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [issueAnchor] = useState(() => new Date());
  const [invoiceCreatedAt, setInvoiceCreatedAt] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(isEdit);
  const [numberLoading, setNumberLoading] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [customerWoItems, setCustomerWoItems] = useState([]);
  const [loadingCustomerWoItems, setLoadingCustomerWoItems] = useState(false);
  const [form, setForm] = useState({
    number: '',
    customerId: '',
    dueDate: '',
    status: 'draft',
    /** Optional % discount on line subtotal (0 or empty = none). */
    discountPercent: '',
    /** Fixed government / levy amount (LKR), not a percentage. */
    govTax: '',
    lineItems: [initialLineItem()],
  });

  const issued = isEdit && invoiceCreatedAt ? invoiceCreatedAt : issueAnchor;
  const issueDateStr = fmtUs(issued);

  useEffect(() => {
    customersApi
      .list()
      .then((res) => setCustomers(res.data?.data ?? res.data ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, []);

  useEffect(() => {
    if (isEdit) return;
    billingApi
      .suggestNextInvoiceNumber()
      .then((body) => {
        const n = body?.data?.number ?? body?.number;
        if (n) setForm((prev) => ({ ...prev, number: n }));
      })
      .catch(() => {})
      .finally(() => setNumberLoading(false));
  }, [isEdit]);

  useEffect(() => {
    if (!id) return;
    billingApi
      .getInvoice(id)
      .then((res) => {
        const inv = res.data ?? res;
        const lineItems =
          inv.lineItems && inv.lineItems.length > 0
            ? inv.lineItems.map((i) => {
                const row = {
                  description: i.description || '',
                  quantity: i.quantity ?? 1,
                  unitPrice: i.unitPrice ?? 0,
                };
                if (i.amount != null && Number.isFinite(Number(i.amount))) {
                  row.amount = Number(i.amount);
                }
                return row;
              })
            : [initialLineItem()];
        setInvoiceCreatedAt(inv.createdAt ? new Date(inv.createdAt) : null);
        setForm({
          number: inv.number || '',
          customerId: inv.customerId ? String(inv.customerId) : '',
          dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
          status: inv.status || 'draft',
          discountPercent:
            inv.discountPercent != null && Number(inv.discountPercent) > 0
              ? String(inv.discountPercent)
              : '',
          govTax: inv.tax != null && Number(inv.tax) !== 0 ? String(inv.tax) : '',
          lineItems,
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoadingInvoice(false));
  }, [id]);

  useEffect(() => {
    const cid = form.customerId && String(form.customerId).trim();
    if (!cid) {
      setCustomerWoItems([]);
      return;
    }
    let cancelled = false;
    setLoadingCustomerWoItems(true);
    workOrdersApi
      .list({ customerId: cid, limit: 100, page: 1 })
      .then((body) => {
        if (cancelled) return;
        const list = Array.isArray(body?.data) ? body.data : body?.data?.data ?? [];
        setCustomerWoItems(aggregateCustomerWorkOrderItems(list));
      })
      .catch(() => {
        if (!cancelled) setCustomerWoItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomerWoItems(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateLineItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          delete next.amount;
        }
        return next;
      }),
    }));
  };

  /** User typed the line total; derive unit price (set qty to 1 if it was 0). */
  const updateLineItemFromAmount = (index, raw) => {
    setForm((prev) => {
      const next = prev.lineItems.map((item, i) => {
        if (i !== index) return item;
        const { amount: _a, ...base } = item;
        const trimmed = String(raw).trim();
        if (trimmed === '') {
          return { ...base, unitPrice: 0 };
        }
        const amt = Number(trimmed);
        if (!Number.isFinite(amt) || amt < 0) return item;
        let q = Number(base.quantity) || 0;
        if (q <= 0) {
          return { ...base, quantity: 1, unitPrice: amt };
        }
        return { ...base, unitPrice: amt / q };
      });
      return { ...prev, lineItems: next };
    });
  };

  const addLineItem = () =>
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, initialLineItem()] }));
  const removeLineItem = (index) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const billedLineItems = useMemo(
    () => form.lineItems.filter((i) => i.description.trim()),
    [form.lineItems]
  );

  const lineSubtotal = useMemo(() => subtotalFromBilledLineItems(billedLineItems), [billedLineItems]);

  const totalQty = useMemo(
    () => billedLineItems.reduce((s, item) => s + (Number(item.quantity) || 0), 0),
    [billedLineItems]
  );
  const avgRate = totalQty > 0 ? lineSubtotal / totalQty : 0;

  const discountPercentNum = Math.min(100, Math.max(0, Number(form.discountPercent) || 0));
  const discountAmount =
    discountPercentNum > 0
      ? roundMoney(Math.min(lineSubtotal, (lineSubtotal * discountPercentNum) / 100))
      : 0;
  const govTaxAmount = Math.max(0, Number(form.govTax) || 0);
  const invoiceTotal = roundMoney(lineSubtotal - discountAmount + govTaxAmount);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c._id) === form.customerId),
    [customers, form.customerId]
  );
  const billPreview = formatBillPreview(selectedCustomer);

  const buildPayload = () => {
    const lineItems = form.lineItems
      .filter((i) => i.description.trim())
      .map((i) => {
        const qty = Number(i.quantity) || 0;
        const price = Number(i.unitPrice) || 0;
        const row = {
          description: i.description.trim(),
          quantity: qty,
          unitPrice: price,
        };
        if (i.amount != null && Number.isFinite(Number(i.amount))) {
          row.amount = Number(i.amount);
        }
        return row;
      });
    const sub = roundMoney(lineItems.reduce((s, li) => s + lineItemRowTotal(li), 0));
    const discPct = Math.min(100, Math.max(0, Number(form.discountPercent) || 0));
    const discAmt =
      discPct > 0 ? roundMoney(Math.min(sub, (sub * discPct) / 100)) : 0;
    const taxFixed = Math.max(0, Number(form.govTax) || 0);
    const tot = roundMoney(sub - discAmt + taxFixed);
    return {
      number: form.number.trim(),
      customerId: form.customerId || undefined,
      status: form.status,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      lineItems,
      subtotal: sub,
      discountPercent: discPct,
      discountAmount: discAmt,
      tax: taxFixed,
      total: tot,
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
      .catch((err) =>
        setError(err.response?.data?.message || (isEdit ? 'Failed to update invoice' : 'Failed to create invoice'))
      )
      .finally(() => setSaving(false));
  };

  if (loadingInvoice) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  const orgName = user?.tenantName?.trim() || 'Your organization';

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title">{isEdit ? 'Edit invoice' : 'New invoice'}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEdit && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={downloadingPdf}
              onClick={() => {
                setError('');
                setDownloadingPdf(true);
                billingApi
                  .downloadInvoicePdf(id)
                  .catch((err) => setError(err.message || 'Failed to download PDF'))
                  .finally(() => setDownloadingPdf(false));
              }}
            >
              {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          )}
          <Link to="/billing" className="btn btn-secondary">
            Back to list
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card invoice-form-shell" style={{ position: 'relative' }}>
        <input
          id="invoice-number-valid"
          className="invoice-form-hidden-valid"
          tabIndex={-1}
          value={numberLoading ? '' : form.number}
          readOnly
          required
          aria-hidden="true"
        />

        <div className="invoice-form-hero" aria-label="Invoice header">
          <span className="invoice-form-hero-title">Invoice</span>
          <span className="invoice-form-hero-num">
            {numberLoading ? '…' : form.number ? `# ${form.number}` : '—'}
          </span>
        </div>

        <div className="invoice-form-body">
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="invoice-form-party-grid">
            <div>
              <div className="invoice-form-kicker">From</div>
              <div className="invoice-form-party-name">{orgName}</div>
              <p className="invoice-form-party-meta">Services & billing · Issued through WorqHub</p>
            </div>
            <div>
              <label className="invoice-form-kicker" htmlFor="customerId" style={{ display: 'block' }}>
                Bill to
              </label>
              <select
                id="customerId"
                className="input"
                value={form.customerId}
                onChange={(e) => update('customerId', e.target.value)}
                disabled={loadingCustomers}
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="invoice-form-party-name" style={{ marginTop: '0.5rem' }}>
                  {selectedCustomer.name}
                </div>
              )}
              {billPreview && <div className="invoice-form-bill-block">{billPreview}</div>}
              {!selectedCustomer && (
                <p className="invoice-form-party-meta" style={{ marginTop: '0.5rem' }}>
                  Choose a customer to show billing details here and on the PDF.
                </p>
              )}
              {form.customerId && (
                <div
                  className="invoice-form-customer-wo-items"
                  aria-live="polite"
                  aria-label="Materials from work orders for this customer"
                  style={{ marginTop: '1rem' }}
                >
                  {loadingCustomerWoItems ? (
                    <p className="invoice-form-party-meta">Loading work orders…</p>
                  ) : customerWoItems.length === 0 ? (
                    <p className="invoice-form-party-meta">No items recorded on work orders for this customer yet.</p>
                  ) : (
                    <div className="table-wrap" style={{ margin: 0, border: '1px solid var(--color-border)' }}>
                      <table className="table" style={{ fontSize: '0.875rem', margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ textAlign: 'right', width: '5rem' }}>Qty</th>
                            <th>Work orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerWoItems.map((row) => (
                            <tr key={row.name}>
                              <td>{row.name}</td>
                              <td style={{ textAlign: 'right' }}>
                                {row.quantity % 1 ? row.quantity.toFixed(2) : row.quantity}
                              </td>
                              <td className="invoice-form-wo-refs">
                                {row.workOrderRefs.join('; ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="invoice-form-rule" />

          <div className="invoice-form-dates-grid">
            <div>
              <span className="invoice-form-dates-label">Invoice date</span>
              <span className="invoice-form-dates-value">{issueDateStr}</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label invoice-form-dates-label" htmlFor="dueDate">
                Due date
              </label>
              <input
                id="dueDate"
                type="date"
                className="input"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
            </div>
            <div>
              <span className="invoice-form-dates-label">Payment terms</span>
              <span className="invoice-form-terms">{paymentTermsLabel(issued, form.dueDate)}</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label invoice-form-dates-label" htmlFor="status">
                Status
              </label>
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

          <div className="table-wrap invoice-form-table-wrap">
            <table className="invoice-form-lines">
              <thead>
                <tr>
                  <th scope="col" className="col-date">
                    Date
                  </th>
                  <th scope="col">Description / service</th>
                  <th scope="col" className="col-num">
                    Qty
                  </th>
                  <th scope="col" className="col-num">
                    Unit price
                  </th>
                  <th scope="col" className="col-num">
                    Line total
                  </th>
                  <th scope="col" className="col-action">
                    <span className="sr-only">Remove line</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((item, index) => {
                  const lineAmt = roundMoney(lineItemRowTotal(item));
                  return (
                    <tr key={index}>
                      <td className="col-date">{issueDateStr}</td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          aria-label={`Line ${index + 1} description`}
                        />
                      </td>
                      <td className="col-num">
                        <input
                          type="number"
                          className="input"
                          placeholder="0"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          aria-label={`Line ${index + 1} quantity`}
                        />
                      </td>
                      <td className="col-num">
                        <input
                          type="number"
                          className="input"
                          placeholder="0.00"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                          aria-label={`Line ${index + 1} unit price (LKR)`}
                          title="Price per unit in LKR"
                        />
                      </td>
                      <td className="col-num invoice-form-amount-cell">
                        <input
                          type="number"
                          className="input"
                          placeholder="0.00"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          value={Number.isFinite(lineAmt) ? lineAmt : 0}
                          onChange={(e) => updateLineItemFromAmount(index, e.target.value)}
                          aria-label={`Line ${index + 1} line total (LKR)`}
                          title="Line total in LKR (qty × unit price); editing this adjusts unit price"
                        />
                      </td>
                      <td className="col-action">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => removeLineItem(index)}
                          disabled={form.lineItems.length <= 1}
                          aria-label={`Remove line ${index + 1}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn btn-secondary repeatable-add" onClick={addLineItem}>
            + Add line item
          </button>

          <div className="invoice-form-adjustments-grid" role="group" aria-label="Tax and discount">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="govTax">
                Gov. tax (fixed LKR)
              </label>
              <input
                id="govTax"
                type="number"
                className="input"
                placeholder="0.00"
                min={0}
                step="any"
                inputMode="decimal"
                value={form.govTax}
                onChange={(e) => update('govTax', e.target.value)}
                title="Fixed government tax or levy amount added to the bill (not a percentage)"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="discountPercent">
                Discount (%){' '}
                <span className="invoice-form-optional-hint">optional</span>
              </label>
              <input
                id="discountPercent"
                type="number"
                className="input"
                placeholder="e.g. 10"
                min={0}
                max={100}
                step="any"
                inputMode="decimal"
                value={form.discountPercent}
                onChange={(e) => update('discountPercent', e.target.value)}
                title="Percentage off the line-item subtotal (leave empty for no discount)"
              />
            </div>
          </div>

          <div className="invoice-form-summary-grid">
            <div className="invoice-form-line-summary">
              <div className="invoice-form-kicker">Line summary</div>
              <div className="invoice-form-stat">
                <span className="invoice-form-stat-label">Total quantity</span>
                <span className="invoice-form-stat-value">
                  {totalQty % 1 ? totalQty.toFixed(2) : String(totalQty)}
                </span>
              </div>
              <div className="invoice-form-stat">
                <span className="invoice-form-stat-label">Avg. unit rate</span>
                <span className="invoice-form-stat-value">
                  {formatMoneyLkr(avgRate)} <span className="invoice-form-currency-suffix">LKR</span>
                </span>
              </div>
            </div>
            <div className="invoice-form-money-summary">
              <div className="invoice-form-money-row">
                <span>Subtotal (lines)</span>
                <span>
                  {formatMoneyLkr(lineSubtotal)} <span className="invoice-form-currency-suffix">LKR</span>
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="invoice-form-money-row invoice-form-money-row--deduct">
                  <span>
                    Discount ({discountPercentNum}%)
                  </span>
                  <span>
                    −{formatMoneyLkr(discountAmount)}{' '}
                    <span className="invoice-form-currency-suffix">LKR</span>
                  </span>
                </div>
              )}
              <div className="invoice-form-money-row">
                <span>Gov. tax (fixed)</span>
                <span>
                  {formatMoneyLkr(govTaxAmount)} <span className="invoice-form-currency-suffix">LKR</span>
                </span>
              </div>
            </div>
          </div>

          <div className="invoice-form-total-bar">
            <span>Total due</span>
            <span>
              {formatMoneyLkr(invoiceTotal)} <span className="invoice-form-currency-suffix">LKR</span>
            </span>
          </div>

          {!isEdit && !numberLoading && (
            <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Invoice number is auto-generated (INV-000-###). It appears on the PDF and cannot be changed after
              creation.
            </p>
          )}
          {isEdit && (
            <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Invoice number cannot be changed when editing.
            </p>
          )}

          <div className="form-actions" style={{ borderTop: 'none', marginTop: '0.5rem', paddingTop: 0 }}>
            <button type="submit" className="btn btn-primary" disabled={saving || numberLoading}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save invoice' : 'Create invoice'}
            </button>
            <Link to="/billing" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
