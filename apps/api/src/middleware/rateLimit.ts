import type { FastifyReply, FastifyRequest } from 'fastify';

const DAY_MS = 24 * 60 * 60 * 1000;

const config: Record<string, { limit: number; windowMs: number }> = {
  POST_NODE_LIMIT: { limit: 30, windowMs: DAY_MS },
  POST_DISCUSSION_LIMIT: { limit: 60, windowMs: DAY_MS },
  POST_COMMENT_LIMIT: { limit: 100, windowMs: DAY_MS },
};

const counters = new Map<string, { count: number; windowStart: number }>();

export function rateLimit(actionKey: keyof typeof config) {
  const { limit, windowMs } = config[actionKey];
  return async function rateLimitHandler(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { id?: string } | undefined)?.id;
    if (!userId) return;

    const now = Date.now();
    const key = `${actionKey}:${userId}`;
    const current = counters.get(key);

    if (!current || now - current.windowStart > windowMs) {
      counters.set(key, { count: 1, windowStart: now });
      return;
    }

    if (current.count >= limit) {
      reply.code(429).send({ message: 'rate limit exceeded for action' });
      return reply;
    }

    current.count += 1;
    counters.set(key, current);
  };
}

export function resetRateLimits() {
  counters.clear();
}
