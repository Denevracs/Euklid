import { apiBaseUrl } from '@/lib/env';
import type { DiscussionDTO, NodeDTO, ReplyDTO, Tier, VoteType } from '@/lib/types';

export const tierWeightMap: Record<Tier, number> = {
  TIER1: 1.0,
  TIER2: 0.75,
  TIER3: 0.5,
  TIER4: 0.25,
};

const API_TOKEN_STORAGE_KEY = 'euclid-api-token';

export function getStoredApiToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(API_TOKEN_STORAGE_KEY);
}

export function setStoredApiToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(API_TOKEN_STORAGE_KEY, token);
}

export async function exchangeSessionForApiToken(forceRefresh = false) {
  if (!forceRefresh) {
    const existing = getStoredApiToken();
    if (existing) {
      return existing;
    }
  }

  const response = await fetch('/api/session-to-api-jwt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to exchange session for API token');
  }

  const payload = (await response.json()) as { token?: string };
  if (payload.token) {
    setStoredApiToken(payload.token);
    return payload.token;
  }

  throw new Error('API token missing from response');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { authenticated?: boolean } = {}
): Promise<T> {
  const { authenticated, ...rest } = init;
  const requestInit: RequestInit = {
    ...rest,
    headers: {
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
    credentials: 'include',
  };

  if (authenticated) {
    const token = await exchangeSessionForApiToken();
    (requestInit.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, requestInit);
  if (response.status === 429) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function fetchNode(id: string) {
  return apiFetch<NodeDTO>(`/nodes/${id}`);
}

export async function fetchDiscussions(nodeId: string) {
  return apiFetch<DiscussionDTO[]>(`/discussions/node/${nodeId}`);
}

export async function fetchReplies(discussionId: string) {
  return apiFetch<ReplyDTO[]>(`/replies/${discussionId}`);
}

export async function fetchRelatedNodes(nodeId: string) {
  const graph = await apiFetch<{
    outgoingEdges: Array<{ to: { id: string; title: string } }>;
    incomingEdges: Array<{ from: { id: string; title: string } }>;
  }>(`/graph?nodeId=${nodeId}&depth=1`);
  const related = new Map<string, string>();
  for (const edge of graph.outgoingEdges ?? []) {
    if (edge.to.id !== nodeId) {
      related.set(edge.to.id, edge.to.title);
    }
  }
  for (const edge of graph.incomingEdges ?? []) {
    if (edge.from.id !== nodeId) {
      related.set(edge.from.id, edge.from.title);
    }
  }
  return Array.from(related.entries()).map(([id, title]) => ({ id, title }));
}

export async function createDiscussion({ nodeId, content }: { nodeId: string; content: string }) {
  return apiFetch(`/discussions`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ nodeId, content }),
    authenticated: true,
  });
}

export async function hideDiscussion(id: string) {
  return apiFetch(`/discussions/${id}/hide`, {
    method: 'PATCH',
    authenticated: true,
  });
}

export async function deleteDiscussion(id: string) {
  await apiFetch(`/discussions/${id}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function deleteReply(id: string) {
  await apiFetch(`/replies/${id}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function createReply({
  discussionId,
  content,
}: {
  discussionId: string;
  content: string;
}) {
  return apiFetch(`/replies`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ discussionId, content }),
    authenticated: true,
  });
}

export async function createVote({ discussionId, type }: { discussionId: string; type: VoteType }) {
  return apiFetch(`/votes`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ discussionId, type }),
    authenticated: true,
  });
}
