import { apiBaseUrl } from '@/lib/env';
import { exchangeSessionForApiToken } from '@/lib/api';
import { followListResponseSchema } from '@/lib/types';

async function authorizedFetch(path: string, init?: RequestInit) {
  const token = await exchangeSessionForApiToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to update follow state');
  }

  return response;
}

export async function followUser(userId: string) {
  const response = await authorizedFetch(`/follow/user/${userId}`, { method: 'POST' });
  return response.json() as Promise<{ following: boolean }>;
}

export async function unfollowUser(userId: string) {
  const response = await authorizedFetch(`/follow/user/${userId}`, { method: 'DELETE' });
  return response.json() as Promise<{ following: boolean }>;
}

export async function followDiscipline(id: string) {
  const response = await authorizedFetch(`/follow/discipline/${id}`, { method: 'POST' });
  return response.json() as Promise<{ following: boolean }>;
}

export async function unfollowDiscipline(id: string) {
  const response = await authorizedFetch(`/follow/discipline/${id}`, { method: 'DELETE' });
  return response.json() as Promise<{ following: boolean }>;
}

export async function listFollows(
  kind: 'user' | 'discipline',
  options: { cursor?: string; limit?: number } = {}
) {
  const params = new URLSearchParams({ kind });
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));

  const response = await authorizedFetch(`/follow/list?${params.toString()}`, { method: 'GET' });
  const json = await response.json();
  return followListResponseSchema.parse(json);
}
