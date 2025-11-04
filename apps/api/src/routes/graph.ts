import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const querySchema = z.object({
  nodeId: z.string().uuid(),
  depth: z.coerce.number().min(1).max(3).default(1),
});

export default async function graphRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/',
    {
      schema: {
        querystring: querySchema,
      },
    },
    async (request, reply) => {
      const { nodeId, depth } = request.query;
      const node = await app.prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          outgoingEdges: {
            include: {
              to: {
                include: depth > 1 ? { outgoingEdges: true, incomingEdges: true } : undefined,
              },
            },
          },
          incomingEdges: {
            include: {
              from: {
                include: depth > 1 ? { outgoingEdges: true, incomingEdges: true } : undefined,
              },
            },
          },
        },
      });
      if (!node) {
        return reply.code(404).send({ error: 'Node not found' });
      }
      return node;
    }
  );
}
