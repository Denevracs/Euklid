import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import adminRoutes from '../admin';
import auditLogger from '../../middleware/auditLogger';

const prismaMock = {
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  adminSetting: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
} as const;

type Role = 'ADMIN' | 'MEMBER';

const buildApp = (role: Role = 'ADMIN') => {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('prisma', prismaMock);

  app.decorate('authenticate', async function (request) {
    request.user = {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      handle: 'admin.user',
      tier: 'TIER1',
      role,
      isHistorical: false,
      verifiedDomains: [],
      verifiedDocs: 0,
      isBanned: false,
      warningsCount: 0,
    } as const;
  });

  app.decorate('requireAuth', app.authenticate);
  app.decorate('requireNotBanned', async () => undefined);
  app.decorate('requireAdmin', async function (request, reply) {
    if (!request.user) {
      await this.authenticate(request, reply);
      if (reply.sent) return;
    }
    if (!request.user || request.user.role !== 'ADMIN') {
      reply.code(403).send({ message: 'Forbidden' });
    }
  });

  void app.register(auditLogger);
  void app.register(adminRoutes, { prefix: '/admin' });

  return app;
};

describe('admin routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects non-admin access', async () => {
    const app = buildApp('MEMBER');
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/admin/users' });
    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('returns paginated user summaries for admins', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        handle: 'alice',
        displayHandle: 'alice',
        tier: 'TIER2',
        role: 'MEMBER',
        isHistorical: false,
        isBanned: false,
        verifiedAt: null,
        verifiedById: null,
        lastLoginAt: null,
        followerCount: 5,
        followingCount: 3,
        postCount: 2,
        discussionCount: 1,
        legacySource: null,
        legacyWorksCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    prismaMock.user.count.mockResolvedValueOnce(1);

    const app = buildApp('ADMIN');
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/admin/users' });
    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.total).toBe(1);
    expect(prismaMock.user.findMany).toHaveBeenCalled();

    await app.close();
  });

  it('updates a user and records an audit log entry', async () => {
    const targetId = '11111111-1111-4111-8111-111111111111';
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetId });
    prismaMock.user.update.mockResolvedValueOnce({ id: targetId, tier: 'TIER1', role: 'ADMIN' });
    prismaMock.auditLog.create.mockResolvedValueOnce({ id: 'log-1' });

    const app = buildApp('ADMIN');
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: `/admin/user/${targetId}/update`,
      headers: { 'content-type': 'application/json' },
      payload: { tier: 'TIER1', role: 'ADMIN' },
    });
    expect(response.statusCode).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetId },
        data: expect.objectContaining({ tier: 'TIER1', role: 'ADMIN' }),
      })
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_USER_UPDATE',
          targetType: 'USER',
          targetId,
        }),
      })
    );

    await app.close();
  });

  it('allows admins to update settings', async () => {
    prismaMock.adminSetting.findMany.mockResolvedValueOnce([]);
    prismaMock.adminSetting.upsert.mockResolvedValueOnce({
      id: 'setting-1',
      key: 'rate_limits',
      value: { posts: 30 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    prismaMock.auditLog.create.mockResolvedValueOnce({ id: 'log-2' });

    const app = buildApp('ADMIN');
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/admin/settings/update',
      headers: { 'content-type': 'application/json' },
      payload: { key: 'rate_limits', value: { posts: 30 } },
    });
    expect(response.statusCode).toBe(200);
    expect(prismaMock.adminSetting.upsert).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_SETTINGS_UPDATE',
          targetType: 'SETTING',
          targetId: 'rate_limits',
        }),
      })
    );

    await app.close();
  });
});
