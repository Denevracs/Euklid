import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tier } from '@prisma/client';
import feedRoutes from '../feed';

const { getFeedMock, getGlobalFeedMock, writeFeedCacheMock } = vi.hoisted(() => ({
  getFeedMock: vi.fn(),
  getGlobalFeedMock: vi.fn(),
  writeFeedCacheMock: vi.fn(),
}));

vi.mock('../../services/feed', () => ({
  getFeed: getFeedMock,
  getGlobalFeed: getGlobalFeedMock,
  writeFeedCache: writeFeedCacheMock,
}));

const sampleNodeItem = {
  kind: 'NODE' as const,
  id: 'node-1',
  score: 42,
  activityId: 'activity-1',
  createdAt: new Date().toISOString(),
  node: {
    id: 'node-1',
    title: 'Sample Node',
    statement: 'Statement',
    createdAt: new Date().toISOString(),
    discipline: { id: 'disc-1', title: 'Geometry' },
  },
  author: {
    id: 'author-1',
    name: 'Alice',
    handle: 'alice',
    tier: Tier.TIER1,
  },
  edgesSummary: { incoming: 1, outgoing: 2 },
  discussionCount: 3,
};

const buildApp = () => {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const requester = {
    id: 'user-follower',
    name: 'Follower',
    handle: 'follower',
    tier: Tier.TIER2,
  };

  app.decorate('prisma', {});
  app.decorate('authenticate', async function authenticate(request) {
    request.jwtUser = requester;
    request.user = requester;
  });
  app.decorate('requireNotBanned', async () => undefined);

  void app.register(feedRoutes, { prefix: '/feed' });
  return app;
};

describe('feed routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    getFeedMock.mockReset();
    getGlobalFeedMock.mockReset();
    writeFeedCacheMock.mockReset();
    getFeedMock.mockResolvedValue({ items: [sampleNodeItem], nextCursor: 'cursor-2' });
    getGlobalFeedMock.mockResolvedValue({ items: [sampleNodeItem], nextCursor: null });
    writeFeedCacheMock.mockResolvedValue(undefined);

    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('returns personalized feed and optionally caches results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/feed?limit=5&cache=true',
    });

    expect(response.statusCode).toBe(200);
    expect(getFeedMock).toHaveBeenCalledWith({}, 'user-follower', { limit: 5, cursor: undefined });
    expect(writeFeedCacheMock).toHaveBeenCalledWith({}, 'user-follower', [sampleNodeItem]);

    const payload = response.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.nextCursor).toEqual('cursor-2');
  });

  it('returns global feed for unauthenticated users', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/feed/global?limit=3',
    });

    expect(response.statusCode).toBe(200);
    expect(getGlobalFeedMock).toHaveBeenCalledWith({}, { limit: 3, cursor: undefined });
    expect(response.json().items).toHaveLength(1);
  });
});
