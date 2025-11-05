import { describe, expect, it, beforeEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { rateLimit, resetRateLimits } from '../rateLimit';

function buildReply() {
  const reply: Partial<FastifyReply> & { statusCode: number; payload: unknown; sent: boolean } = {
    statusCode: 200,
    payload: undefined,
    sent: false,
    code(code: number) {
      this.statusCode = code;
      return this as FastifyReply;
    },
    send(payload: unknown) {
      this.sent = true;
      this.payload = payload;
      return this as FastifyReply;
    },
  };
  return reply as FastifyReply & { statusCode: number; payload: unknown; sent: boolean };
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows requests within the limit and blocks the overflow', async () => {
    const handler = rateLimit('POST_NODE_LIMIT');
    const request = { user: { id: 'user-123' } } as FastifyRequest;

    for (let i = 0; i < 30; i += 1) {
      const reply = buildReply();
      await handler(request, reply);
      expect(reply.statusCode).toBe(200);
      expect(reply.sent).toBe(false);
    }

    const overflowReply = buildReply();
    await handler(request, overflowReply);
    expect(overflowReply.statusCode).toBe(429);
    expect(overflowReply.sent).toBe(true);
    expect(overflowReply.payload).toEqual({ message: 'rate limit exceeded for action' });
  });

  it('resets counts after window reset', async () => {
    const handler = rateLimit('POST_NODE_LIMIT');
    const request = { user: { id: 'user-456' } } as FastifyRequest;

    const replyAccepted = buildReply();
    await handler(request, replyAccepted);
    expect(replyAccepted.sent).toBe(false);

    resetRateLimits();

    const replyAfterReset = buildReply();
    await handler(request, replyAfterReset);
    expect(replyAfterReset.sent).toBe(false);
  });
});
