import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Tier, UserRole } from '@prisma/client';
import { env } from '../lib/env';

type ApiJwtPayload = {
  id: string;
  email: string | null;
  name: string | null;
  handle: string | null;
  displayHandle?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  expertise?: string[];
  tier: Tier;
  role: UserRole;
  isHistorical: boolean;
  verifiedDomains: string[];
  verifiedDocs: number;
  bannedUntil?: string | null;
  isBanned?: boolean;
  warningsCount?: number;
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireNotBanned(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireModerator(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    jwtUser?: ApiJwtPayload;
    user?: ApiJwtPayload;
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      try {
        const payload = await request.jwtVerify<ApiJwtPayload>();
        request.jwtUser = payload;
        request.user = payload;
      } catch (error) {
        if (!reply.sent) {
          reply.code(401).send({ message: 'Unauthorized' });
        }
        return;
      }
    }
  );

  app.decorate('requireAuth', app.authenticate);

  app.decorate(
    'requireNotBanned',
    async function requireNotBanned(request: FastifyRequest, reply: FastifyReply) {
      if (!request.jwtUser) {
        await this.authenticate(request, reply);
        if (reply.sent) {
          return;
        }
      }

      const bannedUntil = request.jwtUser?.bannedUntil;
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        if (!reply.sent) {
          reply.code(403).send({
            message: 'Account is currently banned',
            bannedUntil,
          });
        }
        return;
      }
    }
  );

  app.decorate(
    'requireModerator',
    async function requireModerator(request: FastifyRequest, reply: FastifyReply) {
      if (!request.jwtUser) {
        await this.authenticate(request, reply);
        if (reply.sent) {
          return;
        }
      }

      const role = request.jwtUser?.role;
      if (role !== 'ADMIN' && role !== 'MODERATOR') {
        if (!reply.sent) {
          reply.code(403).send({ message: 'Forbidden' });
        }
      }
    }
  );

  app.decorate(
    'requireAdmin',
    async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
      if (!request.jwtUser) {
        await this.authenticate(request, reply);
        if (reply.sent) {
          return;
        }
      }

      const role = request.jwtUser?.role;
      if (role !== 'ADMIN') {
        if (!reply.sent) {
          reply.code(403).send({ message: 'Forbidden' });
        }
      }
    }
  );
});
