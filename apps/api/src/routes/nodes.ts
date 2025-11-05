import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { nodeCreateSchema, nodeUpdateSchema } from '@euclid/validation';
import { rateLimit } from '../middleware/rateLimit';
import { moderationGuard } from '../middleware/moderationGuard';
import { autoFlagDetection } from '../services/moderation';

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

const nodeUpdatePartialSchema = nodeUpdateSchema.partial();

export default async function nodesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const enforceNodeRateLimit = rateLimit('POST_NODE_LIMIT');

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
      onRequest: [app.authenticate, moderationGuard, app.requireNotBanned, enforceNodeRateLimit],
      schema: {
        body: nodeCreateSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
      const data = nodeCreateSchema.parse(request.body);
      const node = await app.prisma.node.create({
        data: {
          title: data.title,
          statement: data.statement,
          type: data.type,
          status: data.status,
          metadata: data.metadata ?? {},
          createdById: userId,
          outgoingEdges: data.dependencies?.length
            ? {
                create: data.dependencies.map((dependencyId: string) => ({
                  toId: dependencyId,
                  kind: 'DEPENDS_ON' as const,
                  weight: 1,
                })),
              }
            : undefined,
          evidence: data.evidence
            ? {
                create: data.evidence.map((evidence) => ({
                  kind: evidence.kind,
                  uri: evidence.uri,
                  summary: evidence.summary,
                  hash: evidence.hash,
                  confidence: evidence.confidence,
                  addedBy: { connect: { id: userId } },
                })),
              }
            : undefined,
        },
        include: nodeDetailInclude,
      });
      if (autoFlagDetection(data.statement ?? data.title)) {
        request.log.warn({ nodeId: node.id }, 'Auto-flag detection triggered for node content');
      }
      await app.prisma.user.update({
        where: { id: userId },
        data: {
          postCount: { increment: 1 },
          lastActionAt: new Date(),
        },
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
        body: nodeUpdatePartialSchema,
      },
    },
    async (request) => {
      const { id } = request.params;
      const body = nodeUpdatePartialSchema.parse(request.body);
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
