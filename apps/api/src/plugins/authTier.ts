import fp from 'fastify-plugin';
import type { ReputationTier } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      name: string;
      tier: ReputationTier;
    };
  }
}

const demoUser = {
  id: 'demo-user',
  name: 'Demo User',
  tier: 'TIER3' as ReputationTier,
};

export default fp(async (app) => {
  app.addHook('preHandler', async (request) => {
    request.user = demoUser;
  });
});
