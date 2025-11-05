import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { edgeCreateSchema } from '@euclid/validation';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

export default async function edgesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/',
    {
      schema: {
        body: edgeCreateSchema,
      },
    },
    async (request, reply) => {
      const payload = edgeCreateSchema.parse(request.body);
      const edge = await app.prisma.edge.create({
        data: payload,
        include: { from: true, to: true },
      });
      reply.code(201);
      return edge;
    }
  );

  r.delete(
    '/:id',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await app.prisma.edge.delete({ where: { id } });
      reply.code(204).send();
    }
  );
}
