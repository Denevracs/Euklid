import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const querySchema = z.object({ query: z.string().min(1).optional() });

export default async function searchRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/',
    {
      schema: {
        querystring: querySchema,
      },
    },
    async (request) => {
      const { query } = request.query;
      if (!query) {
        return [];
      }
      return app.prisma.node.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { statement: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    }
  );
}
