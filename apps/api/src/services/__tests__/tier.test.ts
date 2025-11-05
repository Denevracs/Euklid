import { describe, expect, it, vi } from 'vitest';
import { Tier, VerificationType } from '@prisma/client';
import { computeVerificationScore, inferTier, recalcAndPersistTier } from '../tier';

const basePrisma = () =>
  ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    verificationSubmission: {
      findMany: vi.fn(),
    },
    userInstitution: {
      findMany: vi.fn(),
    },
    endorsement: {
      findMany: vi.fn(),
    },
    reputationHistory: {
      create: vi.fn(),
    },
  }) as unknown as Parameters<typeof recalcAndPersistTier>[0];

describe('tier service', () => {
  it('infers tier with historical guard', () => {
    expect(inferTier(10, false)).toBe(Tier.TIER4);
    expect(inferTier(40, false)).toBe(Tier.TIER3);
    expect(inferTier(65, false)).toBe(Tier.TIER2);
    expect(inferTier(85, false, { institutionReputationAvg: 75 })).toBe(Tier.TIER1);
    expect(inferTier(50, true)).toBe(Tier.TIER1);
  });

  it('computes verification score with diminishing returns', async () => {
    const prisma = basePrisma();
    const userId = 'user-1';

    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: userId,
      verifiedDomains: ['harvard.edu', 'mit.edu', 'stanford.edu'],
      verifiedDocs: 3,
    });

    (
      prisma.verificationSubmission.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        type: VerificationType.EMAIL_DOMAIN,
        payload: { email: 'user@harvard.edu', domain: 'harvard.edu' },
      },
      { type: VerificationType.ORCID, payload: { orcid: '0000-0000-1234-5678' } },
      {
        type: VerificationType.SCHOLAR_PROFILE,
        payload: { scholar: 'https://scholar.google.com/user' },
      },
    ]);

    (prisma.userInstitution.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { institution: { reputation: 90 } },
      { institution: { reputation: 80 } },
    ]);

    (prisma.endorsement.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { weight: 3 },
      { weight: 5 },
    ]);

    const result = await computeVerificationScore(prisma, userId);
    expect(result.score).toBeGreaterThan(60);
    expect(result.institutionReputationAvg).toBeCloseTo(85);
    expect(result.breakdown.domains).toBeGreaterThan(0);
    expect(result.breakdown.documents).toBeGreaterThan(0);
  });

  it('recalculates and persists tier changes', async () => {
    const prisma = basePrisma();
    const userId = 'user-2';

    const findUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
    findUnique
      .mockResolvedValueOnce({
        id: userId,
        tier: Tier.TIER4,
        isHistorical: false,
        verifiedAt: null,
        verificationScore: 10,
        lastTierEvalAt: null,
      })
      .mockResolvedValueOnce({
        id: userId,
        verifiedDomains: ['mit.edu', 'harvard.edu'],
        verifiedDocs: 2,
      });

    (
      prisma.verificationSubmission.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        type: VerificationType.EMAIL_DOMAIN,
        payload: { email: 'user@mit.edu', domain: 'mit.edu' },
      },
      { type: VerificationType.ORCID, payload: { orcid: '0000-0000-1234-5678' } },
      {
        type: VerificationType.SCHOLAR_PROFILE,
        payload: { scholar: 'https://scholar.google.com/user' },
      },
    ]);

    (prisma.userInstitution.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { institution: { reputation: 90 } },
      { institution: { reputation: 80 } },
    ]);

    (prisma.endorsement.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { weight: 4 },
      { weight: 5 },
    ]);

    (prisma.user.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      tier: Tier.TIER1,
      verificationScore: 95,
      verifiedAt: new Date(),
    });

    const result = await recalcAndPersistTier(prisma, userId);

    expect(result.tier).toBe(Tier.TIER1);
    expect(result.score).toBeGreaterThan(80);

    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.reputationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          reason: expect.stringContaining('tier-adjustment'),
        }),
      })
    );
  });
});
