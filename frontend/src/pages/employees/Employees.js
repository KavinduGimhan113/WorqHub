
/**
 * Employees page — directory-style list with stats, search, and filters.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as employeesApi from '../../api/employees';
import * as workOrdersApi from '../../api/workOrders';
import { getApiErrorMessage } from '../../api/errors';
import ActionButtons from '../../components/ActionButtons';

const statusClass = {
  active: 'badge-completed',
  inactive: 'badge-cancelled',
  on_leave: 'badge-in_progress',
};

function formatStatusLabel(status) {
  const s = status || 'active';
  if (s === 'on_leave') return 'On leave';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [assignedWorkCounts, setAssignedWorkCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    employeesApi
      .list()
      .then((res) => setEmployees(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setEmployees([]);
        } else {
          setError(getApiErrorMessage(err, 'Failed to load employees'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    workOrdersApi
      .list({ limit: 500 })
      .then((res) => {
        const rows = res?.data?.data ?? res?.data ?? [];
        const counts = {};
        (Array.isArray(rows) ? rows : []).forEach((wo) => {
          const assignees = Array.isArray(wo.assignedEmployeeIds) ? wo.assignedEmployeeIds : [];
          assignees.forEach((a) => {
            const id = typeof a === 'object' && a?._id ? String(a._id) : String(a || '');
            if (!id) return;
            counts[id] = (counts[id] || 0) + 1;
          });
        });
        setAssignedWorkCounts(counts);
      })
      .catch(() => setAssignedWorkCounts({}));
  }, []);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => !e.status || e.status === 'active').length;
    const inactive = employees.filter((e) => e.status === 'inactive').length;
    const onLeave = employees.filter((e) => e.status === 'on_leave').length;
    return { total, active, inactive, onLeave };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q) ||
          e.position?.toLowerCase().includes(q) ||
          String(e.employeeId || '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((e) => (e.status || 'active') === statusFilter);
    }
    return list;
  }, [employees, searchQuery, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 200 }}>
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="employees-page">
      <div className="page-toolbar">
        <h2 className="page-title">Employees</h2>
        <Link to="/employees/new" className="btn btn-primary">
          Add employee
        </Link>
      </div>

      <div className="employees-intro card card-body">
        <div className="employees-intro-icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <p className="employees-intro-title">Employee directory</p>
          <p className="employees-intro-text">
            Manage employee records, departments, and contact details. Use search and filters to find people quickly.
          </p>
        </div>
      </div>

      {employees.length > 0 && (
        <div className="employees-stats grid-2">
          <div className="stat-card employees-stat employees-stat--total">
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card employees-stat employees-stat--active">
            <div className="stat-label">Active</div>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="stat-card employees-stat employees-stat--leave">
            <div className="stat-label">On leave</div>
            <div className="stat-value">{stats.onLeave}</div>
          </div>
          <div className="stat-card employees-stat employees-stat--inactive">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{stats.inactive}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      {employees.length > 0 && (
        <div className="employees-filters card card-body">
          <div className="employees-filters-row">
            <label className="label employees-filter-label" htmlFor="employees-search">
              Search
            </label>
            <input
              id="employees-search"
              type="search"
              className="input employees-search-input"
              placeholder="Name, email, department, position, or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="employees-filters-row employees-filters-row--narrow">
            <label className="label employees-filter-label" htmlFor="employees-status">
              Status
            </label>
            <select
              id="employees-status"
              className="input employees-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="employees-filter-summary" role="status">
            Showing {filteredEmployees.length} of {employees.length}
          </div>
        </div>
      )}

      <div className="table-wrap card employees-table-wrap">
        {employees.length === 0 ? (
          <div className="empty-state employees-empty">
            <div className="employees-empty-icon" aria-hidden>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="empty-state-title">No employees yet</h3>
            <p className="empty-state-text">Add employees so you can track roles, departments, and contact info in one place.</p>
            <Link to="/employees/new" className="btn btn-primary">
              Add employee
            </Link>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-state employees-empty employees-empty--filter">
            <h3 className="empty-state-title">No matches</h3>
            <p className="empty-state-text">Try adjusting your search or status filter.</p>
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <table className="table employees-table">
            <thead>
              <tr>
                <th className="employees-th-avatar" scope="col" aria-label="Photo" />
                <th scope="col">Employee</th>
                <th scope="col">ID</th>
                <th scope="col">Department</th>
                <th scope="col">Position</th>
                <th scope="col">Status</th>
                <th scope="col">Assigned works</th>
                <th scope="col" style={{ width: 180 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const employeeKey = String(emp._id || '');
                const assignedCount = assignedWorkCounts[employeeKey] || 0;
                return (
                <tr key={emp._id}>
                  <td className="employees-td-avatar">
                    {emp.photoUrl ? (
                      <img
                        src={emp.photoUrl}
                        alt=""
                        className="employee-list-photo employees-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="employee-list-photo employee-list-photo-placeholder employees-avatar">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="employees-name-block">
                      <span className="employees-name-primary">{emp.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="employees-mono">{emp.employeeId || '—'}</span>
                  </td>
                  <td>{emp.department || '—'}</td>
                  <td>{emp.position || '—'}</td>
                  <td>
                    <span className={`badge ${statusClass[emp.status] || 'badge-draft'}`}>
                      {formatStatusLabel(emp.status)}
                    </span>
                  </td>
                  <td>
                    <div className="employees-assigned-cell">
                      <Link
                        to={`/work-orders?employeeId=${employeeKey}&employeeName=${encodeURIComponent(emp.name || '')}`}
                        className="btn btn-secondary employees-assigned-btn"
                      >
                        View assigned
                      </Link>
                      <span className="employees-assigned-count">
                        {assignedCount} work{assignedCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <ActionButtons
                      basePath="/employees"
                      id={emp._id}
                      onDelete={() =>
                        employeesApi
                          .remove(emp._id)
                          .then(() => setEmployees((prev) => prev.filter((x) => x._id !== emp._id)))
                          .catch((err) => setError(getApiErrorMessage(err, 'Failed to delete')))
                      }
                      itemName="employee"
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

