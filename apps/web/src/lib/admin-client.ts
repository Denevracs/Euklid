import { z } from 'zod';
import { apiFetch, setStoredApiToken } from '@/lib/api';
import {
  adminUsersResponseSchema,
  adminUserDetailSchema,
  adminSettingsSchema,
  adminAuditResponseSchema,
  adminAnalyticsSchema,
} from '@/lib/types';

const adminUsersParamsSchema = z.object({
  query: z.string().optional(),
  tier: z.string().optional(),
  status: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
});

type AdminUsersParams = z.infer<typeof adminUsersParamsSchema>;

type UpdateUserPayload = {
  tier?: string;
  role?: string;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  isHistorical?: boolean;
  legacySource?: string | null;
  displayHandle?: string | null;
};

type AuditQuery = {
  limit?: number;
  cursor?: string | null;
};

export async function fetchAdminUsers(params: AdminUsersParams = {}) {
  const parsed = adminUsersParamsSchema.parse(params);
  const search = new URLSearchParams();
  if (parsed.query) search.set('query', parsed.query);
  if (parsed.tier) search.set('tier', parsed.tier);
  if (parsed.status) search.set('status', parsed.status);
  if (parsed.page) search.set('page', parsed.page.toString());
  if (parsed.limit) search.set('limit', parsed.limit.toString());
  if (parsed.sort) search.set('sort', parsed.sort);
  if (parsed.order) search.set('order', parsed.order);

  const response = await apiFetch(
    `/admin/users${search.toString() ? `?${search.toString()}` : ''}`,
    {
      authenticated: true,
    }
  );
  return adminUsersResponseSchema.parse(response);
}

export async function fetchAdminUser(id: string) {
  const response = await apiFetch(`/admin/user/${id}`, { authenticated: true });
  return adminUserDetailSchema.parse(response);
}

export async function updateAdminUser(id: string, payload: UpdateUserPayload) {
  const response = await apiFetch(`/admin/user/${id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    authenticated: true,
  });
  return adminUserDetailSchema.shape.user.parse(response);
}

export async function fetchAdminSettings() {
  const response = await apiFetch('/admin/settings', { authenticated: true });
  return adminSettingsSchema.parse(response);
}

export async function updateAdminSetting(key: string, value: unknown) {
  const response = await apiFetch('/admin/settings/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
    authenticated: true,
  });
  const parsed = z
    .object({ setting: adminSettingsSchema.shape.settings.element })
    .safeParse(response);
  if (parsed.success) {
    return parsed.data.setting;
  }
  return adminSettingsSchema.shape.settings.element.parse(response);
}

export async function fetchAuditLogs(params: AuditQuery = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', params.limit.toString());
  if (params.cursor) search.set('cursor', params.cursor);
  const response = await apiFetch(
    `/admin/audit${search.toString() ? `?${search.toString()}` : ''}`,
    {
      authenticated: true,
    }
  );
  return adminAuditResponseSchema.parse(response);
}

export async function fetchAdminAnalytics(window = 30) {
  const search = new URLSearchParams({ window: window.toString() });
  const response = await apiFetch(`/admin/analytics?${search.toString()}`, {
    authenticated: true,
  });
  return adminAnalyticsSchema.parse(response);
}

export async function impersonateUser(userId: string) {
  const response = await fetch('/api/admin/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.message === 'string' ? payload.message : 'Unable to impersonate user';
    throw new Error(message);
  }

  if (payload?.token) {
    setStoredApiToken(payload.token);
  }

  return payload;
}
