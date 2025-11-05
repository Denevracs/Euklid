import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Tier, UserRole } from '@prisma/client';

const statusFilterSchema = z.enum(['active', 'banned', 'historical']);
const sortOptionSchema = z.enum(['recent', 'last_login', 'followers', 'posts']);

const listUsersQuerySchema = z.object({
  query: z.string().min(1).optional(),
  tier: z.nativeEnum(Tier).optional(),
  status: statusFilterSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: sortOptionSchema.default('recent').optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const adminUpdateUserSchema = z.object({
  tier: z.nativeEnum(Tier).optional(),
  role: z.nativeEnum(UserRole).optional(),
  verifiedById: z.string().uuid().nullable().optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
  isHistorical: z.boolean().optional(),
  legacySource: z.string().nullable().optional(),
  displayHandle: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_.-]+$/i)
    .nullable()
    .optional(),
});

const settingsUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

const analyticsQuerySchema = z.object({
  window: z.coerce.number().int().min(7).max(180).default(30),
});

export default async function adminRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/users',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        querystring: listUsersQuerySchema,
      },
    },
    async (request) => {
      const { query, tier, status, page, limit, sort, order = 'desc' } = request.query;
      const where: Prisma.UserWhereInput = {};

      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
          { displayHandle: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (tier) {
        where.tier = tier;
      }

      if (status === 'banned') {
        where.isBanned = true;
      } else if (status === 'historical') {
        where.isHistorical = true;
      } else if (status === 'active') {
        where.isBanned = false;
      }

      const skip = (page - 1) * limit;

      const orderBy: Prisma.UserOrderByWithRelationInput[] = [];
      const sortDirection = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

      switch (sort) {
        case 'last_login':
          orderBy.push({ lastLoginAt: sortDirection as Prisma.SortOrder });
          break;
        case 'followers':
          orderBy.push({ followerCount: sortDirection as Prisma.SortOrder });
          break;
        case 'posts':
          orderBy.push({ postCount: sortDirection as Prisma.SortOrder });
          break;
        case 'recent':
        default:
          orderBy.push({ createdAt: sortDirection as Prisma.SortOrder });
          break;
      }

      // Always add deterministic secondary sort
      orderBy.push({ id: sortDirection as Prisma.SortOrder });

      const [items, total] = await Promise.all([
        app.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            email: true,
            handle: true,
            displayHandle: true,
            tier: true,
            role: true,
            isHistorical: true,
            isBanned: true,
            verifiedAt: true,
            verifiedById: true,
            lastLoginAt: true,
            followerCount: true,
            followingCount: true,
            postCount: true,
            discussionCount: true,
            legacySource: true,
            legacyWorksCount: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        app.prisma.user.count({ where }),
      ]);

      return {
        items,
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }
  );

  r.get(
    '/user/:id',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = await app.prisma.user.findUnique({
        where: { id },
        include: {
          verifiedBy: { select: { id: true, name: true, handle: true, displayHandle: true } },
          userInstitutions: true,
        },
      });
      if (!user) {
        return reply.code(404).send({ message: 'User not found' });
      }

      const [moderationEvents, verificationSubmissions, nodes, discussions, endorsements] =
        await Promise.all([
          app.prisma.moderationEvent.findMany({
            where: { targetUserId: id },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          app.prisma.verificationSubmission.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          app.prisma.node.findMany({
            where: { createdById: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, title: true, createdAt: true, status: true },
          }),
          app.prisma.discussion.findMany({
            where: { authorId: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, content: true, createdAt: true, nodeId: true },
          }),
          app.prisma.endorsement.findMany({
            where: { endorseedId: id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              weight: true,
              note: true,
              createdAt: true,
              endorser: {
                select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
              },
            },
          }),
        ]);

      return {
        user,
        moderationEvents,
        verificationSubmissions,
        recentNodes: nodes,
        recentDiscussions: discussions,
        endorsements,
      };
    }
  );

  r.post(
    '/user/:id/update',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: adminUpdateUserSchema,
      },
      config: {
        audit: {
          action: 'ADMIN_USER_UPDATE',
          targetType: 'USER',
          resolveTargetId: (req) => (req.params as { id?: string }).id,
          includeBody: true,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;

      const existing = await app.prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ message: 'User not found' });
      }

      const data: Prisma.UserUpdateInput = {};

      if (body.tier) {
        data.tier = body.tier;
      }
      if (body.role) {
        data.role = body.role;
      }
      if (body.isHistorical !== undefined) {
        data.isHistorical = body.isHistorical;
        if (body.isHistorical && !body.tier) {
          data.tier = Tier.TIER1;
        }
      }
      if (body.legacySource !== undefined) {
        data.legacySource = body.legacySource;
      }
      if (body.displayHandle !== undefined) {
        data.displayHandle = body.displayHandle;
      }

      if (body.verifiedAt !== undefined) {
        data.verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : null;
      }

      let verifiedById = body.verifiedById;
      if (body.verifiedAt && !verifiedById && request.user?.id) {
        verifiedById = request.user.id;
      }

      if (verifiedById !== undefined) {
        data.verifiedById = verifiedById;
      }

      const updated = await app.prisma.user.update({
        where: { id },
        data,
        include: {
          verifiedBy: { select: { id: true, name: true, handle: true, displayHandle: true } },
        },
      });

      await app.prisma.auditLog.create({
        data: {
          actorId: request.user?.id ?? null,
          action: 'ADMIN_USER_UPDATE',
          targetType: 'USER',
          targetId: id,
          meta: body,
        },
      });
      reply.header('x-audit-logged', '1');

      return updated;
    }
  );

  r.get(
    '/settings',
    {
      onRequest: [app.authenticate, app.requireAdmin],
    },
    async () => {
      const settings = await app.prisma.adminSetting.findMany({
        orderBy: { key: 'asc' },
      });
      return { settings };
    }
  );

  r.post(
    '/settings/update',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        body: settingsUpdateSchema,
      },
      config: {
        audit: {
          action: 'ADMIN_SETTINGS_UPDATE',
          targetType: 'SETTING',
          resolveTargetId: (req) => (req.body as { key: string }).key,
          includeBody: true,
        },
      },
    },
    async (request, reply) => {
      const { key, value } = request.body;
      const setting = await app.prisma.adminSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      await app.prisma.auditLog.create({
        data: {
          actorId: request.user?.id ?? null,
          action: 'ADMIN_SETTINGS_UPDATE',
          targetType: 'SETTING',
          targetId: key,
          meta: { key, value },
        },
      });
      reply.header('x-audit-logged', '1');
      return { setting };
    }
  );

  r.get(
    '/audit',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        querystring: auditQuerySchema,
      },
    },
    async (request) => {
      const { limit, cursor } = request.query;

      const logs = await app.prisma.auditLog.findMany({
        take: limit + 1,
        orderBy: { createdAt: 'desc' },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        include: {
          actor: {
            select: { id: true, name: true, handle: true, displayHandle: true, role: true },
          },
        },
      });

      let nextCursor: string | null = null;
      if (logs.length > limit) {
        const next = logs.pop();
        nextCursor = next?.id ?? null;
      }

      return {
        items: logs,
        nextCursor,
      };
    }
  );

  r.get(
    '/analytics',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: {
        querystring: analyticsQuerySchema,
      },
    },
    async (request) => {
      const { window } = request.query;
      const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);

      const [topPosters, topDiscussants, topFollowed, tierBreakdown, signups] = await Promise.all([
        app.prisma.user.findMany({
          orderBy: { postCount: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            handle: true,
            displayHandle: true,
            tier: true,
            postCount: true,
          },
        }),
        app.prisma.user.findMany({
          orderBy: { discussionCount: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            handle: true,
            displayHandle: true,
            tier: true,
            discussionCount: true,
          },
        }),
        app.prisma.user.findMany({
          orderBy: { followerCount: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            handle: true,
            displayHandle: true,
            tier: true,
            followerCount: true,
          },
        }),
        app.prisma.user.groupBy({
          by: ['tier'],
          _sum: {
            postCount: true,
            discussionCount: true,
            followerCount: true,
          },
        }),
        app.prisma.user.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const weeklyMap = new Map<string, number>();
      for (const signup of signups) {
        const key = formatWeek(signup.createdAt);
        weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
      }

      const weeklyGrowth = Array.from(weeklyMap.entries())
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0));

      return {
        topPosters,
        topDiscussants,
        topFollowed,
        tierBreakdown,
        weeklyGrowth,
      };
    }
  );
}

function formatWeek(input: Date): string {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
