import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { Tier } from '@prisma/client';
import { rateLimit } from '../middleware/rateLimit';
import { moderationGuard } from '../middleware/moderationGuard';
import { autoFlagDetection } from '../services/moderation';

const createReplyBody = z.object({
  discussionId: z.string().uuid('discussionId must be uuid').or(z.string().min(1)),
  content: z.string().min(1, 'content is required'),
});

const discussionParams = z.object({
  discussionId: z.string().uuid('discussionId must be uuid').or(z.string().min(1)),
});

const replyParams = z.object({
  id: z.string().uuid('id must be uuid').or(z.string().min(1)),
});

const moderatorTiers = new Set<Tier>([Tier.TIER1, Tier.TIER2]);

export default async function repliesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const enforceCommentRateLimit = rateLimit('POST_COMMENT_LIMIT');

  r.post(
    '/',
    {
      onRequest: [app.authenticate, moderationGuard, app.requireNotBanned, enforceCommentRateLimit],
      schema: { body: createReplyBody },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const { discussionId, content } = createReplyBody.parse(request.body);
      try {
        const newReply = await app.prisma.reply.create({
          data: {
            discussionId,
            content,
            authorId: user.id,
          },
        });
        if (autoFlagDetection(content)) {
          request.log.warn(
            { replyId: newReply.id },
            'Auto-flag detection triggered for reply content'
          );
        }
        return reply.code(201).send(newReply);
      } catch (error) {
        request.log.error(error);
        return reply.code(400).send({ message: 'Unable to create reply' });
      }
    }
  );

  r.get(
    '/:discussionId',
    {
      schema: { params: discussionParams },
    },
    async (request) => {
      const { discussionId } = request.params;
      return app.prisma.reply.findMany({
        where: { discussionId },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, tier: true } },
        },
      });
    }
  );

  r.delete(
    '/:id',
    {
      onRequest: [app.authenticate, moderationGuard, app.requireNotBanned],
      schema: { params: replyParams },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const existing = await app.prisma.reply.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.code(404).send({ message: 'Reply not found' });
      }
      if (existing.authorId !== user.id && !moderatorTiers.has(user.tier)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }
      await app.prisma.reply.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    }
  );
}
