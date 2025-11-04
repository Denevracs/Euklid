import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ReputationTier } from '@prisma/client';

const createDiscussionSchema = z.object({
  nodeId: z.string().uuid('nodeId must be a valid uuid').or(z.string().min(1)),
  content: z.string().min(1, 'content is required'),
});

const paramsByIdSchema = z.object({
  id: z.string().uuid('id must be a valid uuid').or(z.string().min(1)),
});

const paramsByNodeSchema = z.object({
  nodeId: z.string().uuid('nodeId must be a valid uuid').or(z.string().min(1)),
});

function isModerator(tier: ReputationTier) {
  return tier === ReputationTier.TIER1 || tier === ReputationTier.TIER2;
}

export default async function discussionsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/node/:nodeId',
    {
      schema: {
        params: paramsByNodeSchema,
      },
    },
    async (request) => {
      const { nodeId } = request.params;
      return app.prisma.discussion.findMany({
        where: { nodeId, hidden: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, tier: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, name: true, tier: true } } },
          },
          votes: true,
        },
      });
    }
  );

  r.get(
    '/:id',
    {
      schema: {
        params: paramsByIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const discussion = await app.prisma.discussion.findUnique({
        where: { id },
        include: {
          author: { select: { id: true, name: true, tier: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, name: true, tier: true } } },
          },
          votes: true,
        },
      });
      if (!discussion) {
        return reply.code(404).send({ message: 'Discussion not found' });
      }
      return discussion;
    }
  );

  r.post(
    '/',
    {
      schema: {
        body: createDiscussionSchema,
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const { nodeId, content } = request.body;
      try {
        const discussion = await app.prisma.discussion.create({
          data: {
            nodeId,
            content,
            authorId: request.user.id,
          },
        });
        return reply.code(201).send(discussion);
      } catch (error) {
        request.log.error(error);
        return reply.code(400).send({ message: 'Unable to create discussion' });
      }
    }
  );

  r.patch(
    '/:id/hide',
    {
      schema: {
        params: paramsByIdSchema,
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      if (!isModerator(user.tier)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }
      const { id } = request.params;
      const discussion = await app.prisma.discussion.update({
        where: { id },
        data: { hidden: true },
      });
      return reply.send(discussion);
    }
  );

  r.delete(
    '/:id',
    {
      schema: {
        params: paramsByIdSchema,
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const { id } = request.params;
      const discussion = await app.prisma.discussion.findUnique({ where: { id } });
      if (!discussion) {
        return reply.code(404).send({ message: 'Discussion not found' });
      }
      if (discussion.authorId !== user.id && !isModerator(user.tier)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }
      await app.prisma.discussion.delete({ where: { id } });
      return reply.code(204).send();
    }
  );
}
