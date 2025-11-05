import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';

type ResolveTargetId = (request: FastifyRequest) => string | null | undefined;
type MetaSelector = (request: FastifyRequest) => unknown;

declare module 'fastify' {
  interface FastifyContextConfig {
    audit?: {
      action?: string;
      targetType: string;
      resolveTargetId?: ResolveTargetId;
      includeBody?: boolean;
      metaSelector?: MetaSelector;
    };
  }
}

export default fp(async (app) => {
  app.addHook('onResponse', async (request, reply) => {
    const config = request.context.config.audit;
    if (!config) return;
    if (reply.statusCode >= 400) return;

    if (reply.hasHeader('x-audit-logged')) {
      return;
    }

    const method = request.method.toUpperCase();
    if (method !== 'POST' && method !== 'DELETE') {
      return;
    }

    const actor = request.user;
    if (!actor || actor.role !== 'ADMIN') {
      return;
    }

    const targetId =
      config.resolveTargetId?.(request) ??
      (typeof (request.params as Record<string, unknown>)?.id === 'string'
        ? ((request.params as Record<string, unknown>).id as string)
        : null);

    let meta: unknown = null;
    if (config.metaSelector) {
      meta = config.metaSelector(request);
    } else if (config.includeBody) {
      meta = request.body ?? null;
    }

    try {
      await app.prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: config.action ?? `${method} ${request.routeOptions?.url ?? request.url}`,
          targetType: config.targetType,
          targetId: targetId ?? 'UNKNOWN',
          meta: meta as object | null,
        },
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to write audit log');
    }
  });
});
