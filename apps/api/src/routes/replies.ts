import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ReputationTier } from '@prisma/client';

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

const moderatorTiers = new Set<ReputationTier>([ReputationTier.TIER1, ReputationTier.TIER2]);

export default async function repliesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/',
    {
      schema: { body: createReplyBody },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      try {
        const newReply = await app.prisma.reply.create({
          data: {
            discussionId: request.body.discussionId,
            content: request.body.content,
            authorId: user.id,
          },
        });
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
