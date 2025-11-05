import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { VerificationStatus, VerificationType } from '@prisma/client';
import { env, verificationAllowlist, matchDomainPattern, findOrgPolicy } from '../lib/env';
import { isTierStale, recalcAndPersistTier } from '../services/tier';

const exchangeSchema = z.object({
  userId: z.string().uuid(),
});

const startEmailVerificationSchema = z.object({
  email: z.string().email('A valid email is required'),
});

const completeEmailVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(8),
});

const MAX_PENDING_SUBMISSIONS = 10;
const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;

const hashCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

export default async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  const buildJwtPayload = (user: {
    id: string;
    email: string | null;
    name: string | null;
    handle: string | null;
    displayHandle: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
    expertise: string[] | null;
    tier: string;
    role: string;
    isHistorical: boolean;
    verifiedDomains: string[];
    verifiedDocs: number;
    isBanned: boolean;
    warningsCount: number;
    bannedUntil: Date | null;
  }) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    displayHandle: user.displayHandle,
    bio: user.bio,
    website: user.website,
    location: user.location,
    expertise: user.expertise ?? [],
    tier: user.tier,
    role: user.role,
    isHistorical: user.isHistorical,
    verifiedDomains: user.verifiedDomains ?? [],
    verifiedDocs: user.verifiedDocs ?? 0,
    isBanned: user.isBanned ?? false,
    warningsCount: user.warningsCount ?? 0,
    bannedUntil: user.bannedUntil ? user.bannedUntil.toISOString() : null,
  });

  r.post(
    '/session',
    {
      schema: {
        body: exchangeSchema,
      },
    },
    async (request, reply) => {
      const internalSecret = request.headers['x-internal-secret'];
      if (typeof internalSecret !== 'string' || internalSecret !== env.API_INTERNAL_SECRET) {
        return reply.code(401).send({ message: 'Invalid session exchange request' });
      }

      const { userId } = request.body;
      let user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          handle: true,
          displayHandle: true,
          bio: true,
          website: true,
          location: true,
          expertise: true,
          tier: true,
          role: true,
          isHistorical: true,
          verifiedDomains: true,
          verifiedDocs: true,
          isBanned: true,
          warningsCount: true,
          bannedUntil: true,
          lastTierEvalAt: true,
          postCount: true,
          discussionCount: true,
          followerCount: true,
          followingCount: true,
          legacySource: true,
          legacyWorksCount: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ message: 'User not found' });
      }

      if (user.isBanned && user.bannedUntil && user.bannedUntil > new Date()) {
        return reply.code(403).send({
          message: 'Account is currently banned',
          bannedUntil: user.bannedUntil.toISOString(),
        });
      }

      if (user.isBanned && !user.bannedUntil) {
        return reply.code(403).send({
          message: 'Account is currently banned',
          bannedUntil: null,
        });
      }

      if (isTierStale(user.lastTierEvalAt)) {
        await recalcAndPersistTier(app.prisma, userId);
        user = await app.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            handle: true,
            displayHandle: true,
            bio: true,
            website: true,
            location: true,
            expertise: true,
            tier: true,
            role: true,
            isHistorical: true,
            verifiedDomains: true,
            verifiedDocs: true,
            isBanned: true,
            warningsCount: true,
            bannedUntil: true,
            postCount: true,
            discussionCount: true,
            followerCount: true,
            followingCount: true,
            legacySource: true,
            legacyWorksCount: true,
          },
        });
      }

      if (!user) {
        return reply.code(404).send({ message: 'User not found after refresh' });
      }

      const payload = buildJwtPayload(user);
      await app.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          lastIp: request.ip,
        },
      });
      const token = await reply.jwtSign(payload, { expiresIn: '15m' });

      return reply.send({
        token,
        expiresIn: 15 * 60,
        user: payload,
      });
    }
  );

  r.get(
    '/me',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
    },
    async (request) => {
      const sessionUser = request.jwtUser;
      if (!sessionUser) {
        throw new Error('JWT payload missing on authenticated request');
      }

      let dbUser = await app.prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          handle: true,
          displayHandle: true,
          bio: true,
          website: true,
          location: true,
          expertise: true,
          tier: true,
          role: true,
          isHistorical: true,
          verifiedDomains: true,
          verifiedDocs: true,
          isBanned: true,
          warningsCount: true,
          bannedUntil: true,
          verificationScore: true,
          verifiedAt: true,
          lastTierEvalAt: true,
          postCount: true,
          discussionCount: true,
          followerCount: true,
          followingCount: true,
          legacySource: true,
          legacyWorksCount: true,
        },
      });

      if (!dbUser) {
        return {
          user: null,
        };
      }

      if (isTierStale(dbUser.lastTierEvalAt)) {
        await recalcAndPersistTier(app.prisma, dbUser.id);
        dbUser = await app.prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: {
            id: true,
            email: true,
            name: true,
            handle: true,
            displayHandle: true,
            bio: true,
            website: true,
            location: true,
            expertise: true,
            tier: true,
            role: true,
            isHistorical: true,
            verifiedDomains: true,
            verifiedDocs: true,
            isBanned: true,
            warningsCount: true,
            bannedUntil: true,
            verificationScore: true,
            verifiedAt: true,
            lastTierEvalAt: true,
          },
        });
      }

      if (!dbUser) {
        return {
          user: null,
        };
      }

      const [followingUsersCount, followingDisciplinesCount, followersCount] = await Promise.all([
        app.prisma.follow.count({
          where: { followerId: dbUser.id, followeeUserId: { not: null } },
        }),
        app.prisma.follow.count({
          where: { followerId: dbUser.id, followDisciplineId: { not: null } },
        }),
        app.prisma.follow.count({
          where: { followeeUserId: dbUser.id },
        }),
      ]);

      const payload = buildJwtPayload(dbUser);
      request.jwtUser = payload;
      request.user = payload;

      return {
        user: {
          ...payload,
          verificationScore: dbUser.verificationScore,
          verifiedAt: dbUser.verifiedAt?.toISOString() ?? null,
          lastTierEvalAt: dbUser.lastTierEvalAt?.toISOString() ?? null,
          isBanned: dbUser.isBanned ?? false,
          warningsCount: dbUser.warningsCount ?? 0,
          followingUsers: followingUsersCount,
          followingDisciplines: followingDisciplinesCount,
          followers: followersCount,
          followerCount: dbUser.followerCount ?? followersCount,
          followingCount: dbUser.followingCount ?? followingUsersCount,
          postCount: dbUser.postCount ?? 0,
          discussionCount: dbUser.discussionCount ?? 0,
          legacySource: dbUser.legacySource,
          legacyWorksCount: dbUser.legacyWorksCount ?? 0,
        },
      };
    }
  );

  r.post(
    '/verify/email',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        body: startEmailVerificationSchema,
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const { email } = request.body;
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        return reply.code(400).send({ message: 'A valid email domain is required' });
      }

      if (!isDomainAllowed(domain)) {
        return reply.code(400).send({ message: 'Email domain is not eligible for verification' });
      }

      const policy = findOrgPolicy(domain);

      const pendingCount = await app.prisma.verificationSubmission.count({
        where: {
          userId,
          status: VerificationStatus.PENDING,
        },
      });

      if (pendingCount >= MAX_PENDING_SUBMISSIONS) {
        return reply.code(429).send({
          message:
            'Too many pending verification requests. Complete existing ones before submitting new requests.',
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = hashCode(code);
      const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString();

      await app.prisma.verificationSubmission.create({
        data: {
          userId,
          type: VerificationType.EMAIL_DOMAIN,
          status: VerificationStatus.PENDING,
          payload: {
            email,
            domain,
            code: hashedCode,
            expiresAt,
            policyTier: policy?.tier ?? null,
            policyNotes: policy?.notes ?? null,
          },
        },
      });

      app.log.info({ email, code }, 'Dispatched verification code');

      return reply.send({
        message: 'Verification code sent. Check your inbox to complete verification.',
        // For local development we return the code to unblock flows.
        devCode: env.NODE_ENV !== 'production' ? code : undefined,
        candidateTier: policy?.tier ?? null,
      });
    }
  );

  r.post(
    '/verify/code',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        body: completeEmailVerificationSchema,
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const { email, code } = request.body;
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        return reply.code(400).send({ message: 'A valid email domain is required' });
      }

      const submission = await app.prisma.verificationSubmission.findFirst({
        where: {
          userId,
          type: VerificationType.EMAIL_DOMAIN,
          status: VerificationStatus.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!submission) {
        return reply.code(404).send({ message: 'No pending verification found for this email' });
      }

      const storedDomain = submission.payload?.domain?.toLowerCase?.();
      if (storedDomain !== domain) {
        return reply
          .code(400)
          .send({ message: 'Verification code does not match this email domain' });
      }

      const storedExpiresAt = submission.payload?.expiresAt
        ? new Date(submission.payload.expiresAt)
        : null;
      if (!storedExpiresAt || storedExpiresAt < new Date()) {
        return reply
          .code(410)
          .send({ message: 'Verification code has expired. Request a new one.' });
      }

      const storedHash = submission.payload?.code;
      if (!storedHash || storedHash !== hashCode(code)) {
        return reply.code(400).send({ message: 'Verification code is invalid' });
      }

      const result = await app.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            verifiedDomains: true,
          },
        });

        if (!user) {
          throw new Error('User not found during verification');
        }

        const nextDomains = Array.from(new Set([...(user.verifiedDomains ?? []), domain]));

        await tx.user.update({
          where: { id: userId },
          data: {
            verifiedDomains: nextDomains,
          },
        });

        await tx.verificationSubmission.update({
          where: { id: submission.id },
          data: {
            status: VerificationStatus.APPROVED,
            reviewerId: userId,
            reviewedAt: new Date(),
            payload: {
              ...submission.payload,
              code: undefined,
              verifiedAt: new Date().toISOString(),
            },
          },
        });

        return nextDomains;
      });

      const tierResult = await recalcAndPersistTier(app.prisma, userId);
      const policy = findOrgPolicy(domain);

      return reply.send({
        message: 'Email domain verified successfully',
        verifiedDomains: result,
        tier: tierResult.tier,
        verificationScore: tierResult.score,
        candidateTier: policy?.tier ?? null,
      });
    }
  );
}
const isDomainAllowed = (domain: string) => {
  const normalized = domain.toLowerCase();
  if (verificationAllowlist.length === 0) {
    return true;
  }

  return (
    verificationAllowlist.some((pattern) => matchDomainPattern(pattern, normalized)) ||
    Boolean(findOrgPolicy(normalized))
  );
};
