import fp from 'fastify-plugin';
import type { Tier, UserRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      name: string;
      tier: Tier;
      role?: UserRole;
      isBanned?: boolean;
      bannedUntil?: string | null;
      warningsCount?: number;
      displayHandle?: string | null;
      bio?: string | null;
    };
  }
}

const demoUser = {
  id: 'demo-user',
  name: 'Demo User',
  tier: 'TIER3' as Tier,
  role: 'MEMBER' as UserRole,
  isBanned: false,
  bannedUntil: null,
  warningsCount: 0,
};

export default fp(async (app) => {
  app.addHook('preHandler', async (request) => {
    if (!request.user) {
      request.user = demoUser;
    }
  });
});
