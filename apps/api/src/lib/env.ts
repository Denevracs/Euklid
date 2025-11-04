import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.DOTENV_CONFIG_PATH });

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),
    NEO4J_URI: z.string().url().optional(),
    NEO4J_USER: z.string().optional(),
    NEO4J_PASSWORD: z.string().optional(),
  })
  .refine(
    (value) =>
      !(value.NEO4J_URI || value.NEO4J_USER || value.NEO4J_PASSWORD) ||
      (value.NEO4J_URI && value.NEO4J_USER && value.NEO4J_PASSWORD),
    {
      message: 'All Neo4j credentials must be provided together.',
    }
  );

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
});

export const neo4jEnabled = Boolean(env.NEO4J_URI);
