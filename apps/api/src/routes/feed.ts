import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getFeed, getGlobalFeed, writeFeedCache } from '../services/feed';

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  cache: z.coerce.boolean().optional(),
});

export default async function feedRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: { querystring: feedQuerySchema },
    },
    async (request) => {
      const userId = request.user?.id;
      if (!userId) {
        throw app.httpErrors.unauthorized();
      }

      const { limit, cursor, cache } = request.query;
      const result = await getFeed(app.prisma, userId, { limit, cursor });

      if (cache) {
        await writeFeedCache(app.prisma, userId, result.items);
      }

      return result;
    }
  );

  r.get(
    '/global',
    {
      schema: { querystring: feedQuerySchema.pick({ limit: true, cursor: true }) },
    },
    async (request) => {
      const { limit, cursor } = request.query;
      return getGlobalFeed(app.prisma, { limit, cursor });
    }
  );
}
