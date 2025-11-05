import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { VoteType } from '@prisma/client';
import type { Tier } from '@prisma/client';

const voteWeights: Record<Tier, number> = {
  TIER1: 1.0,
  TIER2: 0.5,
  TIER3: 0.25,
  TIER4: 0.1,
} satisfies Record<Tier, number>;

const createVoteSchema = z.object({
  discussionId: z.string().uuid('discussionId must be uuid').or(z.string().min(1)),
  type: z.nativeEnum(VoteType),
});

const discussionParams = z.object({
  discussionId: z.string().uuid('discussionId must be uuid').or(z.string().min(1)),
});

export default async function votesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/',
    {
      schema: { body: createVoteSchema },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const { discussionId, type } = request.body;
      const weight = voteWeights[user.tier] ?? voteWeights.TIER4;

      const existing = await app.prisma.vote.findFirst({
        where: { discussionId, userId: user.id },
      });

      if (existing) {
        const updated = await app.prisma.vote.update({
          where: { id: existing.id },
          data: { type, weight, createdAt: new Date() },
        });
        return reply.send(updated);
      }

      const created = await app.prisma.vote.create({
        data: {
          discussionId,
          type,
          weight,
          userId: user.id,
        },
      });
      return reply.code(201).send(created);
    }
  );

  r.get(
    '/:discussionId',
    {
      schema: { params: discussionParams },
    },
    async (request) => {
      const { discussionId } = request.params;
      const grouped = await app.prisma.vote.groupBy({
        by: ['type'],
        _sum: { weight: true },
        where: { discussionId },
      });
      const totals: Record<VoteType, number> = {
        AGREE: 0,
        DISAGREE: 0,
        REPLICATE: 0,
        CHALLENGE: 0,
      };
      for (const entry of grouped) {
        totals[entry.type] = entry._sum.weight ?? 0;
      }
      return {
        discussionId,
        totals,
      };
    }
  );
}
