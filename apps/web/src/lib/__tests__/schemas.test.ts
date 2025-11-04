import { describe, expect, it } from 'vitest';
import { nodeCreateSchema } from '@euclid/validation';

describe('nodeCreateSchema', () => {
  it('accepts a valid payload', () => {
    const result = nodeCreateSchema.safeParse({
      title: 'Fundamental Theorem of Arithmetic',
      statement:
        'Every integer greater than 1 is either a prime or can be factored into a product of primes.',
      type: 'THEOREM',
      status: 'PROVEN',
      metadata: {
        field: 'Number Theory',
      },
      dependencies: [],
      evidence: [
        {
          kind: 'FORMAL_PROOF',
          uri: 'https://example.com/proof',
          summary: 'Classic proof by induction.',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = nodeCreateSchema.safeParse({
      title: 'Test',
      statement: 'Invalid status example',
      type: 'THEOREM',
      status: 'UNKNOWN',
    } satisfies Record<string, unknown>);

    expect(result.success).toBe(false);
  });
});
