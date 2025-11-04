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
import prismaPlugin from './plugins/prisma';
import { env } from './lib/env';

async function main() {
  const server = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(cors);
  await server.register(helmet);
  await server.register(prismaPlugin);

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

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    server.log.info(`API running at http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

void main();
