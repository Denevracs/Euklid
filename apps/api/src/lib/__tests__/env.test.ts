import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete process.env.JWT_SECRET;
  delete process.env.API_INTERNAL_SECRET;
});

describe('env', () => {
  it('parses configuration with defaults', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/euclid';
    process.env.JWT_SECRET = 'test-jwt-secret-1234567890';
    process.env.API_INTERNAL_SECRET = 'test-internal-secret-0987654321';
    const envModule = await import('../env');
    const { env } = envModule;
    expect(env.HOST).toBeDefined();
    expect(env.PORT).toBeGreaterThan(0);
  });
});
