import type { FastifyReply, FastifyRequest } from 'fastify';

export async function moderationGuard(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as
    | ({
        id?: string;
        isBanned?: boolean;
        bannedUntil?: string | null;
        warningsCount?: number;
      } & Record<string, unknown>)
    | undefined;

  if (!user?.id) return;

  const bannedUntil = user.bannedUntil ? new Date(user.bannedUntil) : null;
  const now = new Date();

  if (user.isBanned && bannedUntil && bannedUntil > now) {
    reply
      .code(403)
      .send({ message: 'Account is currently banned', bannedUntil: bannedUntil.toISOString() });
    return reply.sent ? undefined : reply;
  }

  if (user.isBanned && bannedUntil && bannedUntil <= now) {
    user.isBanned = false;
    user.bannedUntil = null;
  }
}
