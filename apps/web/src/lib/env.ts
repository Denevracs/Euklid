import { z } from 'zod';

const sharedSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url().optional(),
  API_BASE_URL: z.string().url().optional(),
});

const serverSchema = sharedSchema
  .extend({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    EMAIL_SERVER: z.string().min(1),
    EMAIL_FROM: z.string().email(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_ID: z.string().optional(),
    GITHUB_SECRET: z.string().optional(),
    CREDENTIALS_SECRET: z.string().optional(),
    API_INTERNAL_SECRET: z.string().min(16),
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

const sharedEnv = sharedSchema.parse({
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  API_BASE_URL: process.env.API_BASE_URL,
});

const isServer = typeof window === 'undefined';

const serverEnv = isServer
  ? serverSchema.parse({
      NEXT_PUBLIC_API_BASE: sharedEnv.NEXT_PUBLIC_API_BASE,
      API_BASE_URL: sharedEnv.API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      EMAIL_SERVER: process.env.EMAIL_SERVER,
      EMAIL_FROM: process.env.EMAIL_FROM,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_ID: process.env.GITHUB_ID,
      GITHUB_SECRET: process.env.GITHUB_SECRET,
      CREDENTIALS_SECRET: process.env.CREDENTIALS_SECRET,
      API_INTERNAL_SECRET: process.env.API_INTERNAL_SECRET,
      NEO4J_URI: process.env.NEO4J_URI,
      NEO4J_USER: process.env.NEO4J_USER,
      NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    })
  : null;

type ServerEnv = z.infer<typeof serverSchema>;
type SharedEnv = z.infer<typeof sharedSchema>;

export const env = (serverEnv ??
  ({
    NEXT_PUBLIC_API_BASE: sharedEnv.NEXT_PUBLIC_API_BASE,
    API_BASE_URL: sharedEnv.API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  } as Partial<ServerEnv> & SharedEnv)) as ServerEnv;

export const neo4jEnabled = Boolean(serverEnv?.NEO4J_URI);
export const apiBaseUrl =
  serverEnv?.API_BASE_URL ??
  sharedEnv.API_BASE_URL ??
  sharedEnv.NEXT_PUBLIC_API_BASE ??
  'http://localhost:4000';
export const apiInternalSecret = serverEnv?.API_INTERNAL_SECRET ?? '';
