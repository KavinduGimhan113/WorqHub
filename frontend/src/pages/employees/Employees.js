/**
 * Employees page. List and manage employees.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as employeesApi from '../../api/employees';
import ActionButtons from '../../components/ActionButtons';

const statusClass = {
  active: 'badge-completed',
  inactive: 'badge-cancelled',
  on_leave: 'badge-in_progress',
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    employeesApi
      .list()
      .then((res) => setEmployees(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setEmployees([]);
        } else {
          setError(err.response?.data?.message || 'Failed to load employees');
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
        <h2 className="page-title">Employees</h2>
        <Link to="/employees/new" className="btn btn-primary">
          Add employee
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Manage employee records, departments, and contact details.
      </p>

      {error && (
        <div className="login-error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap card">
        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden>👥</div>
            <h3 className="empty-state-title">No employees yet</h3>
            <p className="empty-state-text">Add employees to manage your workforce and track assignments.</p>
            <Link to="/employees/new" className="btn btn-primary">
              Add employee
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                <th>Email</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" className="employee-list-photo" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="employee-list-photo employee-list-photo-placeholder">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td>{emp.employeeId || '—'}</td>
                  <td>{emp.name}</td>
                  <td>{emp.department || '—'}</td>
                  <td>{emp.position || '—'}</td>
                  <td>
                    <span className={`badge ${statusClass[emp.status] || 'badge-draft'}`}>
                      {emp.status?.replace('_', ' ') || 'active'}
                    </span>
                  </td>
                  <td>{emp.email || '—'}</td>
                  <td>
                    <ActionButtons
                      basePath="/employees"
                      id={emp._id}
                      onDelete={() =>
                        employeesApi.remove(emp._id)
                          .then(() => setEmployees((prev) => prev.filter((x) => x._id !== emp._id)))
                          .catch((err) => setError(err.response?.data?.message || 'Failed to delete'))
                      }
                      itemName="employee"
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
