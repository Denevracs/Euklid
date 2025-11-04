import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { nodeCreateSchema, nodeUpdateSchema } from '@euclid/validation';

const paramsSchema = z.object({ id: z.string().uuid() });

const nodeDetailInclude = {
  createdBy: true,
  evidence: true,
  outgoingEdges: {
    include: {
      to: true,
    },
  },
  incomingEdges: {
    include: {
      from: true,
    },
  },
  activity: {
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
  },
} as const;

export default async function nodesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/', async () => {
    return app.prisma.node.findMany({
      orderBy: { createdAt: 'desc' },
      include: nodeDetailInclude,
    });
  });

  r.get(
    '/:id',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const node = await app.prisma.node.findUnique({
        where: { id },
        include: nodeDetailInclude,
      });
      if (!node) {
        return reply.code(404).send({ error: 'Node not found' });
      }
      return node;
    }
  );

  r.post(
    '/',
    {
      schema: {
        body: nodeCreateSchema,
      },
    },
    async (request, reply) => {
      const data = request.body;
      // TODO: wire real auth once auth is extracted. Use first user as placeholder.
      const [actor] = await app.prisma.user.findMany({ take: 1 });
      const createdById = actor?.id ?? (await seedFallbackUser(app));
      const node = await app.prisma.node.create({
        data: {
          title: data.title,
          statement: data.statement,
          type: data.type,
          status: data.status,
          metadata: data.metadata ?? {},
          createdById,
          outgoingEdges: data.dependencies?.length
            ? {
                create: data.dependencies.map((dependencyId) => ({
                  toId: dependencyId,
                  kind: 'DEPENDS_ON' as const,
                  weight: 1,
                })),
              }
            : undefined,
          evidence: data.evidence
            ? {
                create: data.evidence.map((evidence) => ({
                  ...evidence,
                  addedById: createdById,
                })),
              }
            : undefined,
        },
        include: nodeDetailInclude,
      });
      reply.code(201);
      return node;
    }
  );

  r.patch(
    '/:id',
    {
      schema: {
        params: paramsSchema,
        body: nodeUpdateSchema.partial(),
      },
    },
    async (request) => {
      const { id } = request.params;
      const body = request.body;
      const node = await app.prisma.node.update({
        where: { id },
        data: {
          title: body.title,
          statement: body.statement,
          status: body.status,
          type: body.type,
          metadata: body.metadata ?? undefined,
        },
        include: nodeDetailInclude,
      });
      return node;
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
      await app.prisma.node.delete({ where: { id } });
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
