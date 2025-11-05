export const queryKeys = {
  node: (id: string) => ['node', id] as const,
  discussions: (nodeId: string) => ['discussions', nodeId] as const,
  replies: (discussionId: string) => ['replies', discussionId] as const,
  votes: (discussionId: string) => ['votes', discussionId] as const,
  feed: {
    personal: () => ['feed', 'personal'] as const,
    global: () => ['feed', 'global'] as const,
  },
  follow: {
    users: (userId?: string) => ['follow', 'user', userId ?? 'me'] as const,
    disciplines: (userId?: string) => ['follow', 'discipline', userId ?? 'me'] as const,
  },
  verification: {
    overview: () => ['verification', 'overview'] as const,
    queue: (status: string = 'PENDING') => ['verification', 'queue', status] as const,
  },
  moderation: {
    queue: (status: string = 'PENDING') => ['moderation', 'queue', status] as const,
    mine: () => ['moderation', 'mine'] as const,
    stats: (period: string = '7d') => ['moderation', 'stats', period] as const,
    history: (userId: string) => ['moderation', 'history', userId] as const,
    summary: (userId: string) => ['moderation', 'summary', userId] as const,
  },
  admin: {
    users: (params: {
      query?: string;
      tier?: string;
      status?: string;
      page?: number;
      sort?: string;
      order?: string;
    }) =>
      [
        'admin',
        'users',
        params.query ?? '',
        params.tier ?? 'all',
        params.status ?? 'all',
        params.page ?? 1,
        params.sort ?? 'recent',
        params.order ?? 'desc',
      ] as const,
    user: (id: string) => ['admin', 'user', id] as const,
    settings: () => ['admin', 'settings'] as const,
    audit: (cursor?: string | null) => ['admin', 'audit', cursor ?? 'start'] as const,
    analytics: (window: number) => ['admin', 'analytics', window] as const,
  },
  profile: {
    info: (handleOrId: string) => ['profile', 'info', handleOrId] as const,
    activity: (id: string) => ['profile', 'activity', id] as const,
  },
};

export type QueryKeys = typeof queryKeys;
