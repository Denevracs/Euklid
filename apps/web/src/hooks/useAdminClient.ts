'use client';

import { useCallback } from 'react';
import {
  fetchAdminUsers,
  fetchAdminUser,
  updateAdminUser,
  fetchAdminSettings,
  updateAdminSetting,
  fetchAuditLogs,
  fetchAdminAnalytics,
  impersonateUser,
} from '@/lib/admin-client';

export function useAdminClient() {
  const listUsers = useCallback(
    (params?: Parameters<typeof fetchAdminUsers>[0]) => fetchAdminUsers(params),
    []
  );
  const getUser = useCallback((id: string) => fetchAdminUser(id), []);
  const updateUser = useCallback(
    (id: string, payload: Parameters<typeof updateAdminUser>[1]) => updateAdminUser(id, payload),
    []
  );
  const getSettings = useCallback(() => fetchAdminSettings(), []);
  const saveSetting = useCallback(
    (key: string, value: unknown) => updateAdminSetting(key, value),
    []
  );
  const getAuditLogs = useCallback(
    (params?: Parameters<typeof fetchAuditLogs>[0]) => fetchAuditLogs(params),
    []
  );
  const getAnalytics = useCallback((window?: number) => fetchAdminAnalytics(window), []);
  const impersonate = useCallback((userId: string) => impersonateUser(userId), []);

  return {
    listUsers,
    getUser,
    updateUser,
    getSettings,
    saveSetting,
    getAuditLogs,
    getAnalytics,
    impersonate,
  };
}
