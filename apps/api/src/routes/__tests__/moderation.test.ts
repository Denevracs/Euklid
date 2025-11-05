import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import moderationRoutes from '../moderation';

describe('moderation routes', () => {
  const prismaMock = {
    flag: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    moderationEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    node: {
      findUnique: vi.fn(),
    },
    discussion: {
      findUnique: vi.fn(),
    },
    evidence: {
      findUnique: vi.fn(),
    },
    reply: {
      findUnique: vi.fn(),
    },
  } as const;

  const buildApp = () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate('prisma', prismaMock);
    app.decorate('authenticate', async function (request) {
      const userHeader = request.headers['x-test-user'];
      const baseUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        handle: 'test-user',
        tier: 'TIER2',
        role: 'ADMIN',
        isHistorical: false,
        verifiedDomains: [],
        verifiedDocs: 0,
        isBanned: false,
        bannedUntil: null,
        warningsCount: 0,
      } as const;

      if (userHeader === 'moderator') {
        request.user = { ...baseUser, role: 'MODERATOR' } as typeof baseUser;
      } else {
        request.user = baseUser;
      }
    });

    app.decorate('requireNotBanned', async () => undefined);
    app.decorate('requireModerator', async function (request, reply) {
      if (!request.user) {
        await this.authenticate(request, reply);
        if (reply.sent) return;
      }
      if (!request.user || (request.user.role !== 'ADMIN' && request.user.role !== 'MODERATOR')) {
        reply.code(403).send({ message: 'Forbidden' });
      }
    });

    void app.register(moderationRoutes, { prefix: '/moderation' });

    return app;
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('allows users to submit flags', async () => {
    const app = buildApp();
    await app.ready();

    prismaMock.flag.create.mockResolvedValue({ id: 'flag-1' });

    const response = await app.inject({
      method: 'POST',
      url: '/moderation/flag',
      headers: { 'x-test-user': 'admin' },
      payload: { targetType: 'NODE', targetId: 'node-1', reason: 'Test reason' },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.flag.create).toHaveBeenCalled();

    await app.close();
  });

  it('allows moderators to escalate a flag', async () => {
    const app = buildApp();
    await app.ready();

    prismaMock.flag.findUnique.mockResolvedValue({
      id: 'flag-1',
      targetType: 'NODE',
      targetId: 'node-1',
      reason: 'Reasons',
    });
    prismaMock.node.findUnique.mockResolvedValue({ createdById: 'author-1' });
    prismaMock.flag.update.mockResolvedValue({ id: 'flag-1', status: 'ESCALATED' });

    const response = await app.inject({
      method: 'POST',
      url: '/moderation/flag/flag-1/decision',
      headers: { 'x-test-user': 'moderator' },
      payload: { approve: true, escalate: true },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.flag.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'flag-1' },
        data: expect.objectContaining({ status: 'ESCALATED' }),
      })
    );

    await app.close();
  });

  it('records moderation event and bans a user when flag approved with ban', async () => {
    const app = buildApp();
    await app.ready();

    prismaMock.flag.findUnique.mockResolvedValue({
      id: 'flag-2',
      targetType: 'USER',
      targetId: 'user-target',
      reason: 'Abusive behaviour',
    });
    prismaMock.flag.update.mockResolvedValue({ id: 'flag-2', status: 'REVIEWED' });
    prismaMock.moderationEvent.create.mockResolvedValue({ id: 'event-1' });
    prismaMock.user.update.mockResolvedValue({ id: 'user-target' });

    const response = await app.inject({
      method: 'POST',
      url: '/moderation/flag/flag-2/decision',
      headers: { 'x-test-user': 'moderator' },
      payload: { approve: true, ban: true, expiresInDays: 3, note: 'Temporary suspension' },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.flag.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'flag-2' },
        data: expect.objectContaining({ status: 'REVIEWED' }),
      })
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-target' },
        data: expect.objectContaining({ isBanned: true }),
      })
    );
    expect(prismaMock.moderationEvent.create).toHaveBeenCalled();

    await app.close();
  });

  it('returns moderation stats for the specified period', async () => {
    const app = buildApp();
    await app.ready();

    prismaMock.flag.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    prismaMock.user.count.mockResolvedValue(2);

    const response = await app.inject({
      method: 'GET',
      url: '/moderation/stats',
      headers: { 'x-test-user': 'moderator' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      flagsReviewed: 5,
      activeBans: 2,
      pendingFlags: 3,
    });

    await app.close();
  });

  it('returns user moderation summary', async () => {
    const app = buildApp();
    await app.ready();

    prismaMock.user.findUnique.mockResolvedValue({
      warningsCount: 2,
      bansCount: 1,
      mutesCount: 0,
      isBanned: false,
      bannedUntil: null,
    });
    prismaMock.flag.count.mockResolvedValue(1);
    prismaMock.moderationEvent.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/moderation/user/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/summary',
      headers: { 'x-test-user': 'moderator' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ warnings: 2, bans: 1 });

    await app.close();
  });
});
