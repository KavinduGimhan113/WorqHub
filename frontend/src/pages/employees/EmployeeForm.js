/**
 * Employee form: create new or edit existing.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as employeesApi from '../../api/employees';

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    joinDate: '',
    status: 'active',
    address: '',
    notes: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      employeesApi
        .get(id)
        .then((res) => {
          const data = res.data?.data ?? res.data ?? res;
          setForm({
            employeeId: data.employeeId ?? '',
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            department: data.department ?? '',
            position: data.position ?? '',
            joinDate: data.joinDate ? data.joinDate.slice(0, 10) : '',
            status: data.status ?? 'active',
            address: data.address ?? '',
            notes: data.notes ?? '',
            photoUrl: data.photoUrl ?? '',
          });
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load employee'))
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
      employeeId: form.employeeId.trim() || undefined,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      department: form.department.trim() || undefined,
      position: form.position.trim() || undefined,
      joinDate: form.joinDate ? new Date(form.joinDate).toISOString() : undefined,
      status: form.status,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      photoUrl: form.photoUrl.trim() || undefined,
    };
    const promise = isEdit ? employeesApi.update(id, payload) : employeesApi.create(payload);
    promise
      .then(() => navigate('/employees'))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save employee'))
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
        <h2 className="page-title">{isEdit ? 'Edit employee' : 'New employee'}</h2>
        <Link to="/employees" className="btn btn-secondary">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card card-body" style={{ maxWidth: 560 }}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <h3 className="form-section-title">Photo</h3>
          <div className="form-group">
            <label className="label">Employee photo</label>
            <div className="employee-photo-row">
              {form.photoUrl && (
                <div className="employee-photo-preview">
                  <img src={form.photoUrl} alt={form.name || 'Employee'} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div className="employee-photo-inputs">
                <label className="btn btn-secondary employee-photo-file-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => update('photoUrl', reader.result);
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  {form.photoUrl ? 'Change photo' : 'Upload photo'}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Basic info</h3>
          <div className="form-group">
            <label className="label" htmlFor="employeeId">Employee ID</label>
            <input
              id="employeeId"
              type="text"
              className="input"
              value={form.employeeId}
              readOnly
              placeholder={isEdit ? '' : 'Auto-generated (e.g. EMP 0001)'}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="department">Department</label>
              <input
                id="department"
                type="text"
                className="input"
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                placeholder="e.g. Sales, Operations"
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="position">Position</label>
              <input
                id="position"
                type="text"
                className="input"
                value={form.position}
                onChange={(e) => update('position', e.target.value)}
                placeholder="Job title"
              />
            </div>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On leave</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="joinDate">Join date</label>
              <input
                id="joinDate"
                type="date"
                className="input"
                value={form.joinDate}
                onChange={(e) => update('joinDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Contact</h3>
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
          <h3 className="form-section-title">Address & notes</h3>
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
            {saving ? 'Saving…' : isEdit ? 'Update employee' : 'Add employee'}
          </button>
          <Link to="/employees" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
