import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { closeNeo4j } from '../lib/neo4j';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify) => {
  const prisma = new PrismaClient();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    await closeNeo4j();
  });
});
