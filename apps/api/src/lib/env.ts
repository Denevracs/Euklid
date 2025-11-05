import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.DOTENV_CONFIG_PATH });

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),
    JWT_SECRET: z.string().min(16),
    API_INTERNAL_SECRET: z.string().min(16),
    CORS_ORIGIN: z.string().optional(),
    NEO4J_URI: z.string().url().optional(),
    NEO4J_USER: z.string().optional(),
    NEO4J_PASSWORD: z.string().optional(),
    VERIFICATION_ALLOWLIST: z.string().optional(),
    ORG_POLICY_JSON: z.string().optional(),
    RATE_LIMITS_JSON: z.string().optional(),
    STORAGE_BUCKET_ENDPOINT: z.string().optional(),
    STORAGE_BUCKET_ACCESS_KEY: z.string().optional(),
    STORAGE_BUCKET_SECRET_KEY: z.string().optional(),
    STORAGE_BUCKET_REGION: z.string().optional(),
    STORAGE_BUCKET_NAME: z.string().optional(),
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
  JWT_SECRET: process.env.JWT_SECRET,
  API_INTERNAL_SECRET: process.env.API_INTERNAL_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
  VERIFICATION_ALLOWLIST: process.env.VERIFICATION_ALLOWLIST,
  ORG_POLICY_JSON: process.env.ORG_POLICY_JSON,
  RATE_LIMITS_JSON: process.env.RATE_LIMITS_JSON,
  STORAGE_BUCKET_ENDPOINT: process.env.STORAGE_BUCKET_ENDPOINT,
  STORAGE_BUCKET_ACCESS_KEY: process.env.STORAGE_BUCKET_ACCESS_KEY,
  STORAGE_BUCKET_SECRET_KEY: process.env.STORAGE_BUCKET_SECRET_KEY,
  STORAGE_BUCKET_REGION: process.env.STORAGE_BUCKET_REGION,
  STORAGE_BUCKET_NAME: process.env.STORAGE_BUCKET_NAME,
});

export const neo4jEnabled = Boolean(env.NEO4J_URI);
export const allowedOrigins =
  env.CORS_ORIGIN && env.CORS_ORIGIN.length > 0
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

const normalizeList = (value?: string | null) =>
  value
    ? value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    : [];

export const verificationAllowlist = normalizeList(env.VERIFICATION_ALLOWLIST);

export type OrgPolicy = {
  pattern: string;
  tier?: string;
  notes?: string;
};

const parseOrgPolicies = (raw?: string | null): OrgPolicy[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, { tier?: string; notes?: string }>;
    return Object.entries(parsed).map(([pattern, value]) => ({
      pattern: pattern.trim().toLowerCase(),
      tier: value?.tier,
      notes: value?.notes,
    }));
  } catch (error) {
    console.warn('Failed to parse ORG_POLICY_JSON', error);
    return [];
  }
};

export const orgPolicies = parseOrgPolicies(env.ORG_POLICY_JSON);

export const matchDomainPattern = (pattern: string, domain: string) => {
  const normalizedPattern = pattern.toLowerCase();
  if (normalizedPattern.startsWith('*.')) {
    return domain.endsWith(normalizedPattern.slice(1));
  }
  return domain === normalizedPattern;
};

export const findOrgPolicy = (domain: string) =>
  orgPolicies.find((policy) => matchDomainPattern(policy.pattern, domain));
