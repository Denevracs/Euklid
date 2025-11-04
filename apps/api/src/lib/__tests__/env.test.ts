import { describe, expect, it } from 'vitest';

describe('env', () => {
  it('parses configuration with defaults', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/euclid';
    const { env } = await import('../env');
    expect(env.HOST).toBeDefined();
    expect(env.PORT).toBeGreaterThan(0);
  });
});
