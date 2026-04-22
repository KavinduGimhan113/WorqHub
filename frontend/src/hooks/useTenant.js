/**
 * Tenant context from auth. tenantId comes from the session user; tenantName is hydrated via /auth/me when missing.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useTenant() {
  const { tenantId, user, refreshUser } = useAuth();
  const hydrateAttemptedForUserId = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      hydrateAttemptedForUserId.current = null;
      return;
    }
    if (String(user.tenantName || '').trim()) return;
    const id = String(user._id);
    if (hydrateAttemptedForUserId.current === id) return;
    hydrateAttemptedForUserId.current = id;
    void refreshUser();
  }, [user, refreshUser]);

  return { tenantId, tenantName: user?.tenantName || '' };
}
