import { apiBaseUrl } from '@/lib/env';
import { exchangeSessionForApiToken } from '@/lib/api';
import { feedPageSchema } from '@/lib/types';

export async function fetchPersonalFeed({
  cursor,
  limit,
  signal,
}: {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}) {
  const token = await exchangeSessionForApiToken();
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));

  const response = await fetch(`${apiBaseUrl}/feed?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error('Unable to load personalized feed');
  }

  const json = await response.json();
  return feedPageSchema.parse(json);
}

export async function fetchGlobalFeed({
  cursor,
  limit,
  signal,
}: {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));

  const response = await fetch(`${apiBaseUrl}/feed/global?${params.toString()}`, {
    method: 'GET',
    signal,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load global feed');
  }

  const json = await response.json();
  return feedPageSchema.parse(json);
}
