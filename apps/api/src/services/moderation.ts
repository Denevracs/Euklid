import type { PrismaClient } from '@prisma/client';

const bannedWordPattern = /(spam|scam|malware|phishing)/i;

export async function logEvent(
  prisma: PrismaClient,
  params: {
    actorId: string;
    targetUserId?: string | null;
    targetType: string;
    targetId: string;
    action: string;
    reason?: string | null;
    note?: string | null;
    weight?: number;
    expiresAt?: Date | null;
  }
) {
  return prisma.moderationEvent.create({
    data: {
      actorId: params.actorId,
      targetUserId: params.targetUserId ?? null,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      reason: params.reason ?? null,
      note: params.note ?? null,
      weight: params.weight ?? 1,
      expiresAt: params.expiresAt ?? null,
    },
  });
}

export async function isUserBanned(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, bannedUntil: true },
  });
  if (!user) return false;
  if (!user.isBanned) return false;
  if (!user.bannedUntil) return user.isBanned;
  return user.bannedUntil > new Date();
}

export async function escalateFlag(prisma: PrismaClient, flagId: string, moderatorId: string) {
  return prisma.flag.update({
    where: { id: flagId },
    data: {
      status: 'ESCALATED',
      reviewedById: moderatorId,
      reviewedAt: new Date(),
    },
  });
}

export async function summarizeUserModeration(prisma: PrismaClient, userId: string) {
  const [user, activeFlags, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        warningsCount: true,
        bansCount: true,
        mutesCount: true,
        isBanned: true,
        bannedUntil: true,
      },
    }),
    prisma.flag.count({ where: { targetId: userId, status: 'PENDING' } }),
    prisma.moderationEvent.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    warnings: user?.warningsCount ?? 0,
    bans: user?.bansCount ?? 0,
    mutes: user?.mutesCount ?? 0,
    isBanned: user?.isBanned ?? false,
    bannedUntil: user?.bannedUntil ?? null,
    activeFlags,
    recentEvents: events,
  };
}

export function autoFlagDetection(content: string) {
  if (!content) return false;
  return bannedWordPattern.test(content);
}
