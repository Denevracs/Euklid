import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Tier } from '@prisma/client';

const userParamSchema = z.object({ userId: z.string().uuid() });
const disciplineParamSchema = z.object({ id: z.string().uuid() });

const listQuerySchema = z.object({
  kind: z.enum(['user', 'discipline']),
  userId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const DAILY_LIMIT = 100;
const WINDOW_MS = 24 * 60 * 60 * 1000;

type LimitEntry = {
  windowStart: number;
  count: number;
};

const followBudget = new Map<string, LimitEntry>();

function assertFollowAllowance(userId: string) {
  const now = Date.now();
  const current = followBudget.get(userId);
  if (!current || now - current.windowStart > WINDOW_MS) {
    followBudget.set(userId, { windowStart: now, count: 1 });
    return;
  }
  if (current.count >= DAILY_LIMIT) {
    throw new Error('FOLLOW_LIMIT_EXCEEDED');
  }
  current.count += 1;
  followBudget.set(userId, current);
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
    return parsed;
  } catch (error) {
    return null;
  }
}

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64');
}

export default async function followRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  async function ensureNotSelf(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw app.httpErrors.badRequest('You cannot follow yourself');
    }
  }

  async function ensureRateLimit(userId: string) {
    try {
      assertFollowAllowance(userId);
    } catch (error) {
      throw app.httpErrors.tooManyRequests(
        'Daily follow limit reached. Try again tomorrow after engaging with more discussions.'
      );
    }
  }

  r.post(
    '/user/:userId',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { params: userParamSchema },
    },
    async (request) => {
      const followerId = request.user?.id;
      if (!followerId) {
        throw app.httpErrors.unauthorized();
      }

      const { userId: targetId } = request.params;
      await ensureNotSelf(followerId, targetId);

      await ensureRateLimit(followerId);

      const target = await app.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) {
        throw app.httpErrors.notFound('User not found');
      }

      const existing = await app.prisma.follow.findFirst({
        where: { followerId, followeeUserId: targetId },
      });

      if (!existing) {
        await app.prisma.follow.create({
          data: {
            followerId,
            followeeUserId: targetId,
          },
        });

        await Promise.all([
          app.prisma.user.update({
            where: { id: followerId },
            data: { followingCount: { increment: 1 } },
          }),
          app.prisma.user.update({
            where: { id: targetId },
            data: { followerCount: { increment: 1 } },
          }),
        ]);

        await app.prisma.activity.create({
          data: {
            actorId: followerId,
            action: 'FOLLOW',
            targetUserId: targetId,
            weight: 1,
          },
        });

        await app.prisma.feedItem.deleteMany({
          where: { ownerId: followerId },
        });
      }

      return { following: true };
    }
  );

  r.delete(
    '/user/:userId',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { params: userParamSchema },
    },
    async (request) => {
      const followerId = request.user?.id;
      if (!followerId) {
        throw app.httpErrors.unauthorized();
      }

      const { userId: targetId } = request.params;
      await ensureNotSelf(followerId, targetId);

      const result = await app.prisma.follow.deleteMany({
        where: { followerId, followeeUserId: targetId },
      });

      if (result.count > 0) {
        await Promise.all([
          app.prisma.user.update({
            where: { id: followerId },
            data: { followingCount: { decrement: 1 } },
          }),
          app.prisma.user.update({
            where: { id: targetId },
            data: { followerCount: { decrement: 1 } },
          }),
        ]);
      }

      await app.prisma.feedItem.deleteMany({
        where: { ownerId: followerId },
      });

      return { following: false };
    }
  );

  r.post(
    '/discipline/:id',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { params: disciplineParamSchema },
    },
    async (request) => {
      const followerId = request.user?.id;
      if (!followerId) {
        throw app.httpErrors.unauthorized();
      }

      const { id } = request.params;
      await ensureRateLimit(followerId);

      const discipline = await app.prisma.discipline.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!discipline) {
        throw app.httpErrors.notFound('Discipline not found');
      }

      const existing = await app.prisma.follow.findFirst({
        where: { followerId, followDisciplineId: id },
      });

      if (!existing) {
        await app.prisma.follow.create({
          data: {
            followerId,
            followDisciplineId: id,
          },
        });

        await app.prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { increment: 1 } },
        });

        await app.prisma.activity.create({
          data: {
            actorId: followerId,
            action: 'FOLLOW',
            targetDisciplineId: id,
            weight: 1,
          },
        });

        await app.prisma.feedItem.deleteMany({
          where: { ownerId: followerId },
        });
      }

      return { following: true };
    }
  );

  r.delete(
    '/discipline/:id',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { params: disciplineParamSchema },
    },
    async (request) => {
      const followerId = request.user?.id;
      if (!followerId) {
        throw app.httpErrors.unauthorized();
      }

      const { id } = request.params;

      const result = await app.prisma.follow.deleteMany({
        where: { followerId, followDisciplineId: id },
      });

      if (result.count > 0) {
        await app.prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        });
      }

      await app.prisma.feedItem.deleteMany({
        where: { ownerId: followerId },
      });

      return { following: false };
    }
  );

  r.get(
    '/list',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { querystring: listQuerySchema },
    },
    async (request) => {
      const followerId = request.query.userId ?? request.user?.id;
      if (!followerId) {
        throw app.httpErrors.unauthorized();
      }

      const { kind, cursor, limit = 25 } = request.query;
      const decoded = decodeCursor(cursor);

      const baseWhere: Prisma.FollowWhereInput =
        kind === 'user'
          ? {
              followerId,
              followeeUserId: { not: null },
            }
          : {
              followerId,
              followDisciplineId: { not: null },
            };

      if (decoded) {
        const createdAt = new Date(decoded.createdAt);
        baseWhere.AND = [
          {
            OR: [
              { createdAt: { lt: createdAt } },
              {
                AND: [{ createdAt }, { id: { lt: decoded.id } }],
              },
            ],
          },
        ];
      }

      const records = await app.prisma.follow.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          followeeUser:
            kind === 'user'
              ? {
                  select: {
                    id: true,
                    name: true,
                    handle: true,
                    tier: true,
                  },
                }
              : false,
          followDiscipline:
            kind === 'discipline'
              ? {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                  },
                }
              : false,
        },
      });

      const items = records.slice(0, limit).map((record) => ({
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        user: record.followeeUser
          ? {
              id: record.followeeUser.id,
              name: record.followeeUser.name,
              handle: record.followeeUser.handle,
              tier: (record.followeeUser.tier as Tier) ?? Tier.TIER4,
            }
          : null,
        discipline: record.followDiscipline
          ? {
              id: record.followDiscipline.id,
              title: record.followDiscipline.title,
              description: record.followDiscipline.description,
            }
          : null,
      }));

      const next = records.length > limit ? records[limit] : null;

      return {
        items,
        nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
      };
    }
  );
}
