/**
 * Auth context: user, tenantId, role, login, logout.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Re-fetch `/auth/me` without toggling initial `loading` (e.g. hydrate `tenantName`). */
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const { user: u } = await authApi.getCurrentUser();
      if (u) setUser(u);
      return u ?? null;
    } catch {
      return null;
    }
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user: u } = await authApi.getCurrentUser();
      setUser(u);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (email, password, tenantId) => {
    const data = await authApi.login(email, password, tenantId);
    const { user: u, token } = data;
    if (token) localStorage.setItem('token', token);
    if (u) setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    tenantId: user?.tenantId,
    role: user?.role,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
