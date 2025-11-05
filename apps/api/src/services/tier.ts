import { Tier, VerificationStatus, VerificationType } from '@prisma/client';
import type {
  PrismaClient,
  Tier as TierEnum,
  VerificationType as VerificationTypeEnum,
} from '@prisma/client';

type ComputeResult = {
  score: number;
  institutionReputationAvg: number;
  breakdown: {
    domains: number;
    institutions: number;
    documents: number;
    endorsements: number;
    scholarly: number;
    diversity: number;
  };
};

const SCORE_CAP = 100;
const STALE_THRESHOLD_MS = 1000 * 60 * 60 * 24; // 24h

const diminishing = (count: number, factor: number, cap: number): number => {
  if (!count || count <= 0) {
    return 0;
  }
  return Math.min(Math.round(Math.sqrt(count) * factor), cap);
};

const clampWeight = (weight: number | null | undefined): number => {
  if (!weight || Number.isNaN(weight)) {
    return 0;
  }
  return Math.max(1, Math.min(5, weight));
};

export const isTierStale = (lastTierEvalAt: Date | null | undefined): boolean => {
  if (!lastTierEvalAt) {
    return true;
  }
  return Date.now() - lastTierEvalAt.getTime() > STALE_THRESHOLD_MS;
};

export async function computeVerificationScore(
  prisma: PrismaClient,
  userId: string
): Promise<ComputeResult> {
  const [user, approvedSubmissions, verifiedInstitutions, endorsements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        verifiedDomains: true,
        verifiedDocs: true,
      },
    }),
    prisma.verificationSubmission.findMany({
      where: {
        userId,
        status: VerificationStatus.APPROVED,
      },
      select: {
        type: true,
        payload: true,
      },
    }),
    prisma.userInstitution.findMany({
      where: {
        userId,
        verified: true,
      },
      include: {
        institution: {
          select: {
            reputation: true,
          },
        },
      },
    }),
    prisma.endorsement.findMany({
      where: {
        endorseedId: userId,
      },
      select: {
        weight: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error('User not found for verification score computation');
  }

  const uniqueDomains = new Set((user.verifiedDomains ?? []).map((domain) => domain.toLowerCase()));
  const domainScore = diminishing(uniqueDomains.size, 18, 30);

  const docCount = user.verifiedDocs ?? 0;
  const documentScore = diminishing(docCount, 15, 30);

  const institutionCount = verifiedInstitutions.length;
  const institutionScore = diminishing(institutionCount, 20, 35);
  const institutionReputationAvg =
    institutionCount === 0
      ? 0
      : verifiedInstitutions.reduce(
          (sum, record) => sum + (record.institution?.reputation ?? 50),
          0
        ) / institutionCount;

  const endorsementScore = Math.min(
    endorsements.reduce((sum, endorsement) => sum + clampWeight(endorsement.weight), 0),
    20
  );

  let scholarlyScore = 0;
  let emailVerifications = 0;
  const distinctTypes = new Set<VerificationTypeEnum>();

  for (const submission of approvedSubmissions) {
    distinctTypes.add(submission.type);
    if (submission.type === VerificationType.ORCID && submission.payload?.orcid) {
      scholarlyScore += 5;
    }
    if (submission.type === VerificationType.SCHOLAR_PROFILE && submission.payload?.scholar) {
      scholarlyScore += 5;
    }
    if (submission.type === VerificationType.EMAIL_DOMAIN) {
      emailVerifications += 1;
    }
  }

  scholarlyScore = Math.min(scholarlyScore, 10);
  const diversityBonus = Math.min(distinctTypes.size * 4, 12);
  const emailBonus = Math.min(emailVerifications * 3, 9);

  const rawScore =
    domainScore +
    documentScore +
    institutionScore +
    endorsementScore +
    scholarlyScore +
    diversityBonus +
    emailBonus;

  const score = Math.min(SCORE_CAP, Math.max(0, Math.round(rawScore)));

  return {
    score,
    institutionReputationAvg,
    breakdown: {
      domains: domainScore,
      institutions: institutionScore,
      documents: documentScore,
      endorsements: endorsementScore,
      scholarly: scholarlyScore + emailBonus,
      diversity: diversityBonus,
    },
  };
}

export function inferTier(
  score: number,
  isHistorical: boolean,
  context: { institutionReputationAvg?: number } = {}
): TierEnum {
  if (isHistorical) {
    return Tier.TIER1;
  }

  const institutionReputationAvg = context.institutionReputationAvg ?? 0;

  if (score >= 80 && institutionReputationAvg >= 70) {
    return Tier.TIER1;
  }
  if (score >= 60) {
    return Tier.TIER2;
  }
  if (score >= 35) {
    return Tier.TIER3;
  }
  return Tier.TIER4;
}

export async function recalcAndPersistTier(
  prisma: PrismaClient,
  userId: string
): Promise<{ tier: TierEnum; score: number; verifiedAt: Date | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tier: true,
      isHistorical: true,
      verifiedAt: true,
      verificationScore: true,
      lastTierEvalAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const { score, institutionReputationAvg } = await computeVerificationScore(prisma, userId);

  if (user.isHistorical) {
    if (user.verificationScore !== score || !user.lastTierEvalAt) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationScore: score,
          lastTierEvalAt: new Date(),
        },
      });
    }

    return {
      tier: Tier.TIER1,
      score,
      verifiedAt: user.verifiedAt ?? null,
    };
  }

  const nextTier = inferTier(score, false, { institutionReputationAvg });
  const tierChanged = nextTier !== user.tier;
  const now = new Date();

  const updateData: {
    verificationScore: number;
    tier: TierEnum;
    lastTierEvalAt: Date;
    verifiedAt?: Date | null;
  } = {
    verificationScore: score,
    tier: nextTier,
    lastTierEvalAt: now,
  };

  const crossedIntoVerified =
    (!user.verifiedAt || user.verifiedAt === null) &&
    (nextTier === Tier.TIER1 || nextTier === Tier.TIER2);
  if (crossedIntoVerified) {
    updateData.verifiedAt = now;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      verifiedAt: true,
      verificationScore: true,
      tier: true,
    },
  });

  if (tierChanged) {
    const delta = score - (user.verificationScore ?? 0);
    await prisma.reputationHistory.create({
      data: {
        userId,
        delta,
        reason: `tier-adjustment:${user.tier}->${nextTier}`,
      },
    });
  }

  return {
    tier: updated.tier,
    score: updated.verificationScore,
    verifiedAt: updated.verifiedAt ?? null,
  };
}
