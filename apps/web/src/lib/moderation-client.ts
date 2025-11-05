import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  flagSchema,
  moderationEventSchema,
  moderationStatsSchema,
  moderationSummarySchema,
} from '@/lib/types';

const flagsArraySchema = z.array(flagSchema);

export async function submitFlag(input: { targetType: string; targetId: string; reason: string }) {
  const response = await apiFetch('/moderation/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    authenticated: true,
  });
  return flagSchema.parse(response);
}

export async function fetchMyFlags() {
  const response = await apiFetch('/moderation/flag/mine', {
    authenticated: true,
  });
  return flagsArraySchema.parse(response);
}

export async function fetchFlagQueue(status: string = 'PENDING') {
  const params = new URLSearchParams({ status });
  const response = await apiFetch(`/moderation/flag/queue?${params.toString()}`, {
    authenticated: true,
  });
  return flagsArraySchema.parse(response);
}

export async function decideOnFlag(
  id: string,
  body: {
    approve: boolean;
    escalate?: boolean;
    note?: string;
    expiresInDays?: number;
    ban?: boolean;
  }
) {
  const response = await apiFetch(`/moderation/flag/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    authenticated: true,
  });
  return response as { status: string };
}

export async function fetchModerationStats(period: string = '7d') {
  const params = new URLSearchParams({ period });
  const response = await apiFetch(`/moderation/stats?${params.toString()}`, {
    authenticated: true,
  });
  return moderationStatsSchema.parse(response);
}

export async function fetchModerationHistory(userId: string) {
  const response = await apiFetch(`/moderation/history/${userId}`, {
    authenticated: true,
  });
  return z.array(moderationEventSchema).parse(response);
}

export async function fetchModerationSummary(userId: string) {
  const response = await apiFetch(`/moderation/user/${userId}/summary`, {
    authenticated: true,
  });
  return moderationSummarySchema.parse(response);
}

export async function unbanUser(userId: string) {
  return apiFetch(`/moderation/unban/${userId}`, {
    method: 'POST',
    authenticated: true,
  });
}
