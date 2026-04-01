/**
 * Work order form: create new or edit existing.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as workOrdersApi from '../../api/workOrders';
import * as customersApi from '../../api/customers';
import * as employeesApi from '../../api/employees';
import * as inventoryApi from '../../api/inventory';
import { sortInventoryByWidgetSku } from '../../utils/inventorySkuSort';

/** API list endpoints resolve to `{ success, data: T[] }` (axios body, not the full response). */
function apiListArray(body) {
  if (body == null) return [];
  const rows = body.data;
  return Array.isArray(rows) ? rows : [];
}

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

const initialItem = () => ({ name: '', categoryId: '', quantity: '', unit: 'unit' });

function inventoryRowCategoryId(inv) {
  if (inv?.categoryId == null) return '';
  return typeof inv.categoryId === 'object' && inv.categoryId?._id
    ? String(inv.categoryId._id)
    : String(inv.categoryId);
}

function inventoryItemsForCategory(allItems, categoryId) {
  if (!categoryId) return [];
  const cid = String(categoryId);
  return sortInventoryByWidgetSku(
    allItems.filter((inv) => inventoryRowCategoryId(inv) === cid)
  );
}

export default function WorkOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [inventoryItemsLoading, setInventoryItemsLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState([]);
  /** Controlled value for “add employee” dropdown (reset after each add). */
  const [assignEmployeePicker, setAssignEmployeePicker] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    scheduledAt: '',
    assignedEmployeeIds: [],
    items: [initialItem()],
  });

  useEffect(() => {
    customersApi
      .list()
      .then((body) => setCustomers(apiListArray(body)))
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  }, []);

  useEffect(() => {
    employeesApi
      .list()
      .then((body) => setEmployees(apiListArray(body)))
      .catch(() => setEmployees([]))
      .finally(() => setEmployeesLoading(false));
  }, []);

  useEffect(() => {
    inventoryApi
      .listCategories()
      .then((body) => setCategories(apiListArray(body)))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    inventoryApi
      .list()
      .then((body) => setInventoryItems(sortInventoryByWidgetSku(apiListArray(body))))
      .catch(() => setInventoryItems([]))
      .finally(() => setInventoryItemsLoading(false));
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
          const assignees = Array.isArray(data.assignedEmployeeIds)
            ? data.assignedEmployeeIds
                .map((x) =>
                  typeof x === 'object' && x?._id != null ? String(x._id) : x != null ? String(x) : ''
                )
                .filter(Boolean)
            : [];
          setForm({
            customerId: customerIdStr,
            title: data.title ?? '',
            description: data.description ?? '',
            status: data.status ?? 'draft',
            priority: data.priority ?? 'medium',
            scheduledAt: data.scheduledAt ? data.scheduledAt.slice(0, 16) : '',
            assignedEmployeeIds: assignees,
            items: Array.isArray(data.items) && data.items.length
              ? data.items.map((i) => ({
                  name: i.name ?? '',
                  categoryId:
                    typeof i.categoryId === 'object' && i.categoryId?._id
                      ? String(i.categoryId._id)
                      : i.categoryId
                        ? String(i.categoryId)
                        : '',
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

  const employeesSorted = useMemo(
    () =>
      [...employees].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
      ),
    [employees]
  );

  const employeesAvailableForPicker = useMemo(
    () => employeesSorted.filter((emp) => !form.assignedEmployeeIds.includes(String(emp._id))),
    [employeesSorted, form.assignedEmployeeIds]
  );

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleItemCategoryChange = (index, categoryId) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, categoryId, name: '', unit: item.unit || 'unit' } : item
      ),
    }));
  };

  const handleItemInventoryChange = (index, inventoryId) => {
    if (!inventoryId) {
      updateItem(index, 'name', '');
      return;
    }
    const inv = inventoryItems.find((x) => String(x._id) === String(inventoryId));
    if (!inv) return;
    const cid = inventoryRowCategoryId(inv);
    const unit = inv.unit != null && String(inv.unit).trim() ? String(inv.unit).trim() : 'unit';
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              name: String(inv.name || '').trim(),
              categoryId: cid,
              unit,
            }
          : item
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

  const addAssignedEmployeeFromDropdown = (employeeId) => {
    if (!employeeId) return;
    setForm((prev) => {
      if (prev.assignedEmployeeIds.includes(employeeId)) return prev;
      return { ...prev, assignedEmployeeIds: [...prev.assignedEmployeeIds, employeeId] };
    });
    setAssignEmployeePicker('');
  };

  const removeAssignedEmployee = (employeeId) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.filter((x) => x !== employeeId),
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
          categoryId: i.categoryId || undefined,
          quantity: Number(i.quantity) || 0,
          unit: i.unit || 'unit',
        })),
      assignedEmployeeIds: form.assignedEmployeeIds,
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

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 840 }}>
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
            {employeesLoading ? (
              <p className="form-hint" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Loading employees…
              </p>
            ) : employees.length === 0 ? (
              <p className="form-hint" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No employees yet.{' '}
                <Link to="/employees/new">Add an employee</Link> to assign them here.
              </p>
            ) : (
              <div className="work-order-assign-block" role="group" aria-label="Assign employees">
                <label className="label work-order-assign-select-label" htmlFor="assign-employee-select">
                  Add employee
                </label>
                <select
                  id="assign-employee-select"
                  className="input work-order-assign-select"
                  value={assignEmployeePicker}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) addAssignedEmployeeFromDropdown(v);
                  }}
                  disabled={employeesAvailableForPicker.length === 0}
                >
                  <option value="">
                    {employeesAvailableForPicker.length === 0
                      ? form.assignedEmployeeIds.length > 0
                        ? 'All employees are assigned — remove one to re-add'
                        : 'No employees available'
                      : 'Choose an employee to add…'}
                  </option>
                  {employeesAvailableForPicker.map((emp) => (
                    <option key={emp._id} value={String(emp._id)}>
                      {emp.name}
                      {emp.department ? ` — ${emp.department}` : emp.position ? ` — ${emp.position}` : ''}
                    </option>
                  ))}
                </select>
                {form.assignedEmployeeIds.length > 0 && (
                  <ul className="work-order-assign-chips" aria-label="Employees assigned to this work order">
                    {form.assignedEmployeeIds.map((empId) => {
                      const emp = employees.find((e) => String(e._id) === empId);
                      const label = emp?.name || 'Employee';
                      const meta =
                        emp && (emp.position || emp.department)
                          ? [emp.position, emp.department].filter(Boolean).join(' · ')
                          : '';
                      return (
                        <li key={empId} className="work-order-assign-chip">
                          <span className="work-order-assign-chip-text">
                            <span className="work-order-assign-chip-name">{label}</span>
                            {meta ? (
                              <span className="work-order-assign-chip-meta">{meta}</span>
                            ) : null}
                          </span>
                          <button
                            type="button"
                            className="work-order-assign-chip-remove"
                            onClick={() => removeAssignedEmployee(empId)}
                            aria-label={`Remove ${label} from this work order`}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
          <p className="form-hint work-order-items-hint">
            Choose a category, then pick an inventory item. Item choices appear after a category is selected.
          </p>
          {form.items.map((item, index) => {
            const rowItems = inventoryItemsForCategory(inventoryItems, item.categoryId);
            const nameMatch = rowItems.find(
              (inv) => String(inv.name || '').trim() === String(item.name || '').trim()
            );
            const inventorySelectValue = nameMatch ? String(nameMatch._id) : '';
            const orphanName =
              item.name &&
              item.categoryId &&
              !nameMatch &&
              String(item.name).trim();

            return (
              <div key={index} className="repeatable-row work-order-item-repeatable">
                <div className="work-order-item-fields">
                  <div className="work-order-item-category-item">
                    <div className="form-group work-order-item-field">
                      <label className="label" htmlFor={`wo-item-cat-${index}`}>
                        Category
                      </label>
                      <select
                        id={`wo-item-cat-${index}`}
                        className="input"
                        value={item.categoryId || ''}
                        onChange={(e) => handleItemCategoryChange(index, e.target.value)}
                        disabled={categoriesLoading || categories.length === 0}
                      >
                        <option value="">
                          {categoriesLoading
                            ? 'Loading categories…'
                            : categories.length
                              ? 'Select category'
                              : 'No categories'}
                        </option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group work-order-item-field">
                      <label className="label" htmlFor={`wo-item-inv-${index}`}>
                        Item
                      </label>
                      <select
                        id={`wo-item-inv-${index}`}
                        className="input"
                        value={inventorySelectValue}
                        onChange={(e) => handleItemInventoryChange(index, e.target.value)}
                        disabled={
                          inventoryItemsLoading ||
                          !item.categoryId ||
                          rowItems.length === 0
                        }
                      >
                        <option value="">
                          {!item.categoryId
                            ? 'Select category first'
                            : inventoryItemsLoading
                              ? 'Loading items…'
                              : rowItems.length === 0
                                ? 'No items in this category'
                                : 'Select item'}
                        </option>
                        {rowItems.map((inv) => (
                          <option key={inv._id} value={String(inv._id)}>
                            {inv.sku ? `${inv.sku} · ` : ''}
                            {inv.name}
                          </option>
                        ))}
                      </select>
                      {orphanName ? (
                        <p className="form-hint work-order-item-orphan-hint" role="status">
                          Saved line still references “{String(item.name).trim()}”. Pick an item above or change
                          category to replace it.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="form-row work-order-item-qty-row">
                    <div className="form-group">
                      <label className="label" htmlFor={`wo-item-qty-${index}`}>
                        Qty
                      </label>
                      <input
                        id={`wo-item-qty-${index}`}
                        type="number"
                        className="input"
                        placeholder="Qty"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        style={{ width: 96 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label" htmlFor={`wo-item-unit-${index}`}>
                        Unit
                      </label>
                      <input
                        id={`wo-item-unit-${index}`}
                        type="text"
                        className="input"
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        style={{ width: 96 }}
                      />
                    </div>
                  </div>
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
            );
          })}
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
