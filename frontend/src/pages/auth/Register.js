/**
 * Register placeholder. Links back to login.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="login-screen">
      <div className="login-panel login-panel-form" style={{ maxWidth: '400px' }}>
        <h1 className="login-heading">Sign up</h1>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
          Registration is not yet available. Please contact your administrator for access.
        </p>
        <Link to="/login" className="login-signup-link" style={{ display: 'inline-block' }}>
          ← Back to Sign in
        </Link>
      </div>
    </div>
  );
}
