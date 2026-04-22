/**
 * Settings page. Tenant and user management (Admin only).
 */
import React from 'react';

export default function Settings() {
  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Manage your tenant, users, and preferences.
      </p>
      <div className="card">
        <div className="card-body">
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Tenant & users
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Add users, change roles, and update tenant settings. Full settings UI coming soon.
          </p>
        </div>
      </div>
    </>
  );
}
