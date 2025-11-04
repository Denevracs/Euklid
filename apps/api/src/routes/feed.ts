import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const feedQuerySchema = z.object({
  userId: z.string().optional(),
});

export default async function feedRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/',
    {
      schema: {
        querystring: feedQuerySchema,
      },
    },
    async (request) => {
      const { userId } = request.query;

      const [recentDiscussions, recentReplies, activeVoteGroups] = await Promise.all([
        app.prisma.discussion.findMany({
          where: { hidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            node: { select: { id: true, title: true } },
            author: { select: { id: true, name: true, tier: true } },
          },
        }),
        app.prisma.reply.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            discussion: {
              select: {
                id: true,
                nodeId: true,
              },
            },
            author: { select: { id: true, name: true, tier: true } },
          },
        }),
        app.prisma.vote.groupBy({
          by: ['discussionId'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
            },
          },
          _sum: { weight: true },
          orderBy: { _sum: { weight: 'desc' } },
          take: 5,
        }),
      ]);

      const discussionIds = activeVoteGroups.map((group) => group.discussionId);
      const activeDiscussions = discussionIds.length
        ? await app.prisma.discussion.findMany({
            where: { id: { in: discussionIds }, hidden: false },
            include: {
              node: { select: { id: true, title: true } },
              author: { select: { id: true, name: true, tier: true } },
            },
          })
        : [];

      return {
        forUser: userId ?? request.user?.id ?? null,
        discussions: recentDiscussions,
        replies: recentReplies,
        mostActive: activeDiscussions.map((discussion) => ({
          discussion,
          score:
            activeVoteGroups.find((group) => group.discussionId === discussion.id)?._sum.weight ??
            0,
        })),
      };
    }
  );
}
