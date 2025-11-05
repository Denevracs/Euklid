import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { logEvent, escalateFlag, summarizeUserModeration } from '../services/moderation';

const flagBodySchema = z.object({
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  reason: z.string().min(4),
});

const decisionBodySchema = z.object({
  approve: z.boolean(),
  escalate: z.boolean().optional(),
  note: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
  ban: z.boolean().optional(),
});

async function resolveTargetUserId(
  app: FastifyInstance,
  flag: { targetType: string; targetId: string }
) {
  const type = flag.targetType.toUpperCase();

  if (type === 'USER') {
    return flag.targetId;
  }

  if (type === 'NODE') {
    const node = await app.prisma.node.findUnique({
      where: { id: flag.targetId },
      select: { createdById: true },
    });
    return node?.createdById ?? null;
  }

  if (type === 'DISCUSSION') {
    const discussion = await app.prisma.discussion.findUnique({
      where: { id: flag.targetId },
      select: { authorId: true },
    });
    return discussion?.authorId ?? null;
  }

  if (type === 'EVIDENCE') {
    const evidence = await app.prisma.evidence.findUnique({
      where: { id: flag.targetId },
      select: { addedById: true },
    });
    return evidence?.addedById ?? null;
  }

  if (type === 'COMMENT' || type === 'REPLY') {
    const reply = await app.prisma.reply.findUnique({
      where: { id: flag.targetId },
      select: { authorId: true },
    });
    return reply?.authorId ?? null;
  }

  return null;
}

export default async function moderationRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/flag',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { body: flagBodySchema },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user?.id) return reply.code(401).send({ message: 'Unauthorized' });

      const body = request.body;
      const targetType = body.targetType.toUpperCase();

      try {
        const flag = await app.prisma.flag.create({
          data: {
            reporterId: user.id,
            targetType,
            targetId: body.targetId,
            reason: body.reason,
          },
        });
        return flag;
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return reply.code(409).send({ message: 'Flag already submitted for this target' });
        }
        throw error;
      }
    }
  );

  r.get(
    '/flag/mine',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
    },
    async (request) => {
      const user = request.user;
      if (!user?.id) return [];
      return app.prisma.flag.findMany({
        where: { reporterId: user.id },
        orderBy: { createdAt: 'desc' },
      });
    }
  );

  r.get(
    '/flag/queue',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: {
        querystring: z.object({ status: z.string().optional().default('PENDING') }),
      },
    },
    async (request) => {
      const { status } = request.query;
      const normalizedStatus = status.toUpperCase();
      return app.prisma.flag.findMany({
        where: { status: normalizedStatus },
        orderBy: { createdAt: 'desc' },
      });
    }
  );

  r.post(
    '/flag/:id/decision',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: { body: decisionBodySchema, params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      const moderator = request.user;
      if (!moderator?.id) return reply.code(401).send({ message: 'Unauthorized' });

      const flag = await app.prisma.flag.findUnique({
        where: { id: request.params.id },
      });
      if (!flag) return reply.code(404).send({ message: 'Flag not found' });

      const body = request.body;

      if (body.escalate) {
        await escalateFlag(app.prisma, flag.id, moderator.id);
        return { status: 'ESCALATED' };
      }

      if (!body.approve) {
        await app.prisma.flag.update({
          where: { id: flag.id },
          data: {
            status: 'REJECTED',
            decisionNote: body.note ?? null,
            reviewedById: moderator.id,
            reviewedAt: new Date(),
          },
        });
        return { status: 'REJECTED' };
      }

      const targetUserId = await resolveTargetUserId(app, flag);
      if (!targetUserId) {
        return reply.code(400).send({ message: 'Unable to resolve flag target user' });
      }

      await app.prisma.flag.update({
        where: { id: flag.id },
        data: {
          status: 'REVIEWED',
          decisionNote: body.note ?? null,
          reviewedById: moderator.id,
          reviewedAt: new Date(),
        },
      });

      const expiresInDays = body.expiresInDays ?? 7;
      let expiresAt: Date | null = null;
      if (body.ban) {
        expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      }

      await logEvent(app.prisma, {
        actorId: moderator.id,
        targetUserId,
        targetType: flag.targetType,
        targetId: flag.targetId,
        action: body.ban ? 'BAN' : 'WARN',
        reason: flag.reason,
        note: body.note,
        expiresAt,
      });

      if (body.ban) {
        await app.prisma.user.update({
          where: { id: targetUserId },
          data: {
            isBanned: true,
            bannedUntil: expiresAt,
            bansCount: { increment: 1 },
            lastActionAt: new Date(),
          },
        });
      } else {
        await app.prisma.user.update({
          where: { id: targetUserId },
          data: {
            warningsCount: { increment: 1 },
            lastActionAt: new Date(),
          },
        });
      }

      return { status: 'REVIEWED' };
    }
  );

  r.get(
    '/history/:userId',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: { params: z.object({ userId: z.string().uuid() }) },
    },
    async (request) => {
      return app.prisma.moderationEvent.findMany({
        where: { targetUserId: request.params.userId },
        orderBy: { createdAt: 'desc' },
      });
    }
  );

  r.post(
    '/unban/:userId',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: { params: z.object({ userId: z.string().uuid() }) },
    },
    async (request) => {
      const moderator = request.user;
      const user = await app.prisma.user.update({
        where: { id: request.params.userId },
        data: {
          isBanned: false,
          bannedUntil: null,
        },
      });

      await logEvent(app.prisma, {
        actorId: moderator!.id,
        targetUserId: user.id,
        targetType: 'USER',
        targetId: user.id,
        action: 'UNBAN',
        note: 'Manual unban executed',
      });

      return { ok: true };
    }
  );

  r.get(
    '/stats',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: {
        querystring: z.object({ period: z.string().optional().default('7d') }),
      },
    },
    async (request) => {
      const { period } = request.query;
      const match = period.match(/^(\d+)([dw])$/i);
      let days = 7;
      if (match) {
        const value = Number.parseInt(match[1] ?? '7', 10);
        const unit = match[2]?.toLowerCase();
        days = unit === 'w' ? value * 7 : value;
      }
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [flagsReviewed, activeBans, pendingFlags] = await Promise.all([
        app.prisma.flag.count({ where: { status: 'REVIEWED', reviewedAt: { gte: since } } }),
        app.prisma.user.count({ where: { isBanned: true, bannedUntil: { gt: new Date() } } }),
        app.prisma.flag.count({ where: { status: 'PENDING' } }),
      ]);

      return {
        flagsReviewed,
        activeBans,
        pendingFlags,
      };
    }
  );

  r.get(
    '/user/:userId/summary',
    {
      onRequest: [app.authenticate, app.requireNotBanned, app.requireModerator],
      schema: { params: z.object({ userId: z.string().uuid() }) },
    },
    async (request, reply) => {
      const data = await summarizeUserModeration(app.prisma, request.params.userId);
      if (!data) {
        return reply.code(404).send({ message: 'User not found' });
      }
      return data;
    }
  );
}
