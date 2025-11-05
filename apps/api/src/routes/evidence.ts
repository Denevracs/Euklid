import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { evidenceCreateSchema } from '@euclid/validation';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

export default async function evidenceRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/',
    {
      schema: {
        body: evidenceCreateSchema,
      },
    },
    async (request, reply) => {
      const [actor] = await app.prisma.user.findMany({ take: 1 });
      const addedById = actor?.id ?? (await seedFallbackUser(app));
      const payload = evidenceCreateSchema.parse(request.body);
      const evidence = await app.prisma.evidence.create({
        data: {
          kind: payload.kind,
          uri: payload.uri,
          summary: payload.summary,
          hash: payload.hash,
          confidence: payload.confidence,
          node: { connect: { id: payload.nodeId } },
          addedBy: { connect: { id: addedById } },
        },
        include: { addedBy: true, node: true },
      });
      reply.code(201);
      return evidence;
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
      await app.prisma.evidence.delete({ where: { id } });
      reply.code(204).send();
    }
  );
}

async function seedFallbackUser(app: FastifyInstance) {
  const user = await app.prisma.user.create({
    data: {
      name: 'System',
      email: `system-${Date.now()}@euclid.network`,
      role: 'MEMBER',
    },
  });
  return user.id;
}
