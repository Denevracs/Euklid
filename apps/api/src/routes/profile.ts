import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  bio: z.string().max(10_000, 'Bio is too long').nullable().optional(),
  website: z.string().url('Website must be a valid URL').nullable().optional(),
  location: z.string().max(255, 'Location is too long').nullable().optional(),
  expertise: z.array(z.string().min(1).max(120)).max(25).nullable().optional(),
});

const handleOrIdSchema = z.object({ handleOrId: z.string().min(1) });

export default async function profileRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/:handleOrId',
    {
      schema: {
        params: handleOrIdSchema,
      },
    },
    async (request, reply) => {
      const { handleOrId } = request.params;
      const user = await app.prisma.user.findFirst({
        where: {
          OR: [{ id: handleOrId }, { handle: handleOrId }, { displayHandle: handleOrId }],
        },
        select: {
          id: true,
          name: true,
          handle: true,
          displayHandle: true,
          bio: true,
          website: true,
          location: true,
          expertise: true,
          followerCount: true,
          followingCount: true,
          postCount: true,
          discussionCount: true,
          tier: true,
          role: true,
          isHistorical: true,
          legacySource: true,
          legacyWorksCount: true,
          verifiedAt: true,
          verifiedDocs: true,
          verifiedDomains: true,
          verifiedBy: { select: { id: true, name: true, handle: true, displayHandle: true } },
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ message: 'Profile not found' });
      }

      const [followersPreview, followingPreview] = await Promise.all([
        app.prisma.follow.findMany({
          where: { followeeUserId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            follower: {
              select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
            },
          },
        }),
        app.prisma.follow.findMany({
          where: { followerId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            followeeUser: {
              select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
            },
          },
        }),
      ]);

      return {
        user: {
          ...user,
          expertise: user.expertise ?? [],
          verifiedDomains: user.verifiedDomains ?? [],
          verifiedDocs: user.verifiedDocs ?? 0,
        },
        followersPreview: followersPreview
          .map((f) => f.follower)
          .filter((f): f is NonNullable<typeof f> => Boolean(f)),
        followingPreview: followingPreview
          .map((f) => f.followeeUser)
          .filter((f): f is NonNullable<typeof f> => Boolean(f)),
      };
    }
  );

  r.patch(
    '/update',
    {
      onRequest: [app.authenticate, app.requireAuth, app.requireNotBanned],
      schema: {
        body: profileUpdateSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const body = request.body;
      const data: Record<string, unknown> = {};

      if (body.bio !== undefined) data.bio = body.bio;
      if (body.website !== undefined) data.website = body.website;
      if (body.location !== undefined) data.location = body.location;
      if (body.expertise !== undefined) data.expertise = body.expertise ?? [];

      const updated = await app.prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          lastActionAt: new Date(),
        },
        select: {
          id: true,
          bio: true,
          website: true,
          location: true,
          expertise: true,
          updatedAt: true,
        },
      });

      return updated;
    }
  );

  r.get(
    '/activity/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const exists = await app.prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!exists) {
        return reply.code(404).send({ message: 'User not found' });
      }

      const [nodes, discussions, endorsements] = await Promise.all([
        app.prisma.node.findMany({
          where: { createdById: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            statement: true,
            createdAt: true,
            status: true,
          },
        }),
        app.prisma.discussion.findMany({
          where: { authorId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            content: true,
            createdAt: true,
            nodeId: true,
          },
        }),
        app.prisma.endorsement.findMany({
          where: { endorserId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            endorseed: { select: { id: true, name: true, handle: true, displayHandle: true } },
            weight: true,
            note: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        nodes,
        discussions,
        endorsements,
      };
    }
  );
}
