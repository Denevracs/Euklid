import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import nodesRoutes from './routes/nodes';
import edgesRoutes from './routes/edges';
import evidenceRoutes from './routes/evidence';
import graphRoutes from './routes/graph';
import searchRoutes from './routes/search';
import discussionsRoutes from './routes/discussions';
import repliesRoutes from './routes/replies';
import votesRoutes from './routes/votes';
import feedRoutes from './routes/feed';
import followRoutes from './routes/follow';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import prismaPlugin from './plugins/prisma';
import jwtPlugin from './plugins/jwt';
import authTier from './plugins/authTier';
import auditLogger from './middleware/auditLogger';
import authRoutes from './routes/auth';
import verificationRoutes from './routes/verification';
import profileRoutes from './routes/profile';
import { env, allowedOrigins } from './lib/env';

async function main() {
  const server = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });
  await server.register(helmet);
  await server.register(prismaPlugin);
  await server.register(jwtPlugin);
  await server.register(authTier);
  await server.register(auditLogger);

  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Euclid Network API',
        version: '0.1.0',
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await server.register(nodesRoutes, { prefix: '/nodes' });
  await server.register(edgesRoutes, { prefix: '/edges' });
  await server.register(evidenceRoutes, { prefix: '/evidence' });
  await server.register(graphRoutes, { prefix: '/graph' });
  await server.register(searchRoutes, { prefix: '/search' });
  await server.register(discussionsRoutes, { prefix: '/discussions' });
  await server.register(repliesRoutes, { prefix: '/replies' });
  await server.register(votesRoutes, { prefix: '/votes' });
  await server.register(feedRoutes, { prefix: '/feed' });
  await server.register(followRoutes, { prefix: '/follow' });
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(verificationRoutes, { prefix: '/verification' });
  await server.register(moderationRoutes, { prefix: '/moderation' });
  await server.register(profileRoutes, { prefix: '/profile' });
  await server.register(adminRoutes, { prefix: '/admin' });

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    server.log.info(`API running at http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

void main();
