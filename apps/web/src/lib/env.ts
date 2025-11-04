import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    EMAIL_SERVER: z.string().min(1),
    EMAIL_FROM: z.string().email(),
    NEO4J_URI: z.string().url().optional(),
    NEO4J_USER: z.string().optional(),
    NEO4J_PASSWORD: z.string().optional(),
  })
  .refine(
    (value) =>
      !(value.NEO4J_URI || value.NEO4J_USER || value.NEO4J_PASSWORD) ||
      (value.NEO4J_URI && value.NEO4J_USER && value.NEO4J_PASSWORD),
    {
      message: 'NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must all be provided together.',
    }
  );

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  EMAIL_SERVER: process.env.EMAIL_SERVER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
});

export const neo4jEnabled = Boolean(env.NEO4J_URI);
