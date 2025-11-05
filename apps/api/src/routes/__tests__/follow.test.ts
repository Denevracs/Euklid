import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tier } from '@prisma/client';
import followRoutes from '../follow';

type FollowRecord = {
  id: string;
  followerId: string;
  followeeUserId: string | null;
  followDisciplineId: string | null;
  createdAt: Date;
};

type ActivityRecord = {
  actorId: string;
  action: string;
  targetUserId?: string;
  targetDisciplineId?: string;
};

const buildMockPrisma = () => {
  let counter = 0;
  const followers: FollowRecord[] = [];
  const activities: ActivityRecord[] = [];
  const feedInvalidations: string[] = [];

  const users = new Map([
    [
      '11111111-1111-4111-8111-111111111111',
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Follower',
        handle: 'follower',
        tier: Tier.TIER2,
      },
    ],
    [
      '22222222-2222-4222-8222-222222222222',
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Target',
        handle: 'target',
        tier: Tier.TIER1,
      },
    ],
    [
      '33333333-3333-4333-8333-333333333333',
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Another',
        handle: 'another',
        tier: Tier.TIER3,
      },
    ],
    [
      '44444444-4444-4444-8444-444444444444',
      {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Third',
        handle: 'third',
        tier: Tier.TIER4,
      },
    ],
    [
      '66666666-6666-4666-8666-666666666666',
      {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Fourth',
        handle: 'fourth',
        tier: Tier.TIER3,
      },
    ],
  ]);

  const disciplines = new Map([
    [
      '55555555-5555-4555-8555-555555555555',
      {
        id: '55555555-5555-4555-8555-555555555555',
        title: 'Geometry',
        description: 'Spatial reasoning',
      },
    ],
  ]);

  const prisma = {
    follow: {
      findFirst: vi.fn(async ({ where }) => {
        return (
          followers.find(
            (record) =>
              record.followerId === where.followerId &&
              record.followeeUserId === where.followeeUserId
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }) => {
        counter += 1;
        const createdAt = data.createdAt ?? new Date(Date.now() + counter);
        const record: FollowRecord = {
          id: `follow-${counter}`,
          followerId: data.followerId,
          followeeUserId: data.followeeUserId ?? null,
          followDisciplineId: data.followDisciplineId ?? null,
          createdAt,
        };
        followers.push(record);
        return record;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = followers.length;
        const predicate = (record: FollowRecord) => {
          if (where.followerId && record.followerId !== where.followerId) {
            return true;
          }
          if (where.followeeUserId !== undefined) {
            return record.followeeUserId !== where.followeeUserId;
          }
          if (where.followDisciplineId !== undefined) {
            return record.followDisciplineId !== where.followDisciplineId;
          }
          return true;
        };
        const kept = followers.filter(predicate);
        followers.length = 0;
        followers.push(...kept);
        return { count: before - kept.length };
      }),
      findMany: vi.fn(async ({ where, take = followers.length, include }) => {
        let filtered = followers.filter((record) => {
          if (where?.followerId && record.followerId !== where.followerId) {
            return false;
          }
          if (
            where?.followeeUserId &&
            typeof where.followeeUserId === 'string' &&
            record.followeeUserId !== where.followeeUserId
          ) {
            return false;
          }
          if (where?.followeeUserId?.not === null && record.followeeUserId === null) {
            return false;
          }
          if (where?.followDisciplineId?.not === null && record.followDisciplineId === null) {
            return false;
          }
          if (
            where?.followDisciplineId &&
            typeof where.followDisciplineId === 'string' &&
            record.followDisciplineId !== where.followDisciplineId
          ) {
            return false;
          }
          return true;
        });

        if (where?.AND?.length) {
          const cursorClause = where.AND[0];
          const orClauses = Array.isArray(cursorClause?.OR) ? cursorClause.OR : [];
          let ltDate: Date | null = null;
          let eqDate: Date | null = null;
          let idLt: string | null = null;

          for (const clause of orClauses) {
            if (clause?.createdAt?.lt instanceof Date) {
              ltDate = clause.createdAt.lt;
            }
            if (Array.isArray(clause?.AND)) {
              for (const entry of clause.AND) {
                if (entry?.createdAt instanceof Date) {
                  eqDate = entry.createdAt;
                }
                if (typeof entry?.id?.lt === 'string') {
                  idLt = entry.id.lt;
                }
              }
            }
          }

          if (ltDate || (eqDate && idLt)) {
            filtered = filtered.filter((record) => {
              if (ltDate && record.createdAt.getTime() < ltDate.getTime()) {
                return true;
              }
              if (
                eqDate &&
                idLt &&
                record.createdAt.getTime() === eqDate.getTime() &&
                record.id < idLt
              ) {
                return true;
              }
              return false;
            });
          }
        }

        filtered = filtered.slice().sort((a, b) => {
          if (a.createdAt.getTime() !== b.createdAt.getTime()) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          return b.id.localeCompare(a.id);
        });

        const slice = filtered.slice(0, take);
        return slice.map((record) => ({
          ...record,
          followeeUser:
            include?.followeeUser && record.followeeUserId
              ? (users.get(record.followeeUserId) ?? null)
              : null,
          followDiscipline:
            include?.followDiscipline && record.followDisciplineId
              ? (disciplines.get(record.followDisciplineId) ?? null)
              : null,
        }));
      }),
    },
    activity: {
      create: vi.fn(async ({ data }) => {
        activities.push(data);
        return {
          id: `activity-${activities.length}`,
          createdAt: new Date(),
          ...data,
        };
      }),
    },
    feedItem: {
      deleteMany: vi.fn(async ({ where }) => {
        feedInvalidations.push(where.ownerId);
        return { count: 0 };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where, select }) => {
        const user = users.get(where.id) ?? null;
        if (!user) return null;
        if (!select) return user;
        return Object.fromEntries(
          Object.entries(select)
            .filter(([, enabled]) => enabled)
            .map(([key]) => [key, (user as Record<string, unknown>)[key]])
        );
      }),
    },
    discipline: {
      findUnique: vi.fn(async ({ where, select }) => {
        const discipline = disciplines.get(where.id) ?? null;
        if (!discipline) return null;
        if (!select) return discipline;
        return Object.fromEntries(
          Object.entries(select)
            .filter(([, enabled]) => enabled)
            .map(([key]) => [key, (discipline as Record<string, unknown>)[key]])
        );
      }),
    },
  };

  return {
    prisma,
    state: {
      followers,
      activities,
      feedInvalidations,
    },
  };
};

const buildApp = (prisma: ReturnType<typeof buildMockPrisma>['prisma']) => {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const requester = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Follower',
    handle: 'follower',
    tier: Tier.TIER2,
  };

  app.decorate('prisma', prisma);
  app.decorate('authenticate', async function authenticate(request) {
    request.jwtUser = requester;
    request.user = requester;
  });
  app.decorate('requireNotBanned', async () => undefined);

  void app.register(followRoutes, { prefix: '/follow' });

  return app;
};

describe('follow routes', () => {
  let mock: ReturnType<typeof buildMockPrisma>;
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    mock = buildMockPrisma();
    app = buildApp(mock.prisma);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('creates a user follow, records an activity, and invalidates cache', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/follow/user/22222222-2222-4222-8222-222222222222',
    });

    expect(response.statusCode, response.payload).toBe(200);
    expect(response.json()).toEqual({ following: true });
    expect(mock.prisma.follow.create).toHaveBeenCalledTimes(1);
    expect(mock.prisma.activity.create).toHaveBeenCalledTimes(1);
    expect(mock.prisma.feedItem.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: '11111111-1111-4111-8111-111111111111' },
    });

    // Second call is idempotent
    const again = await app.inject({
      method: 'POST',
      url: '/follow/user/22222222-2222-4222-8222-222222222222',
    });
    expect(again.statusCode).toBe(200);
    expect(mock.prisma.follow.create).toHaveBeenCalledTimes(1);
  });

  it('creates a discipline follow and deletes cache on unfollow', async () => {
    const followResponse = await app.inject({
      method: 'POST',
      url: '/follow/discipline/55555555-5555-4555-8555-555555555555',
    });
    expect(followResponse.statusCode, followResponse.payload).toBe(200);
    expect(mock.prisma.follow.create).toHaveBeenCalledTimes(1);

    const unfollowResponse = await app.inject({
      method: 'DELETE',
      url: '/follow/discipline/55555555-5555-4555-8555-555555555555',
    });
    expect(unfollowResponse.statusCode).toBe(200);
    expect(mock.prisma.feedItem.deleteMany).toHaveBeenCalledTimes(2);
  });

  it('paginates follow list results', async () => {
    await app.inject({ method: 'POST', url: '/follow/user/22222222-2222-4222-8222-222222222222' });
    await app.inject({ method: 'POST', url: '/follow/user/33333333-3333-4333-8333-333333333333' });
    await app.inject({ method: 'POST', url: '/follow/user/44444444-4444-4444-8444-444444444444' });
    await app.inject({ method: 'POST', url: '/follow/user/66666666-6666-4666-8666-666666666666' });

    const firstPage = await app.inject({
      method: 'GET',
      url: '/follow/list?kind=user&limit=2',
    });
    expect(firstPage.statusCode, firstPage.payload).toBe(200);
    const firstPayload = firstPage.json();
    expect(firstPayload.items).toHaveLength(2);
    expect(firstPayload.nextCursor).toBeTruthy();
    const firstIds = firstPayload.items.map((item: { id: string }) => item.id);

    const secondPage = await app.inject({
      method: 'GET',
      url: `/follow/list?kind=user&cursor=${firstPayload.nextCursor}`,
    });
    expect(secondPage.statusCode).toBe(200);
    const secondPayload = secondPage.json();
    const secondIds = secondPayload.items.map((item: { id: string }) => item.id);
    expect(secondIds.length).toBeLessThanOrEqual(2);
    for (const id of secondIds) {
      expect(firstIds).not.toContain(id);
    }
    expect(secondPayload.nextCursor).toBeNull();
  });
});
