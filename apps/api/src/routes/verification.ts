import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { VerificationStatus, VerificationType, UserRole } from '@prisma/client';
import { recalcAndPersistTier } from '../services/tier';

const MAX_PENDING_SUBMISSIONS = 10;

const jsonPayloadSchema = z.object({}).catchall(z.unknown());

const submissionSchema = z.object({
  type: z.nativeEnum(VerificationType),
  payload: jsonPayloadSchema,
});

const adminQueueQuerySchema = z.object({
  status: z.nativeEnum(VerificationStatus).optional(),
  type: z.nativeEnum(VerificationType).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().uuid().optional(),
});

const adminDecisionSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).optional(),
  addDomain: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .refine((value) => !value.includes('@'), 'Provide a domain without @')
    .optional(),
  institutionId: z.string().uuid().optional(),
  verifiedDocInc: z.coerce.number().int().min(0).max(10).optional(),
});

const endorseSchema = z.object({
  weight: z.coerce.number().int().min(1).max(5).optional(),
  note: z.string().trim().max(280).optional(),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

const submissionIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function verificationRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/submit',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        body: submissionSchema,
      },
    },
    async (request, reply) => {
      const userId = request.jwtUser?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const pendingCount = await app.prisma.verificationSubmission.count({
        where: {
          userId,
          status: VerificationStatus.PENDING,
        },
      });

      if (pendingCount >= MAX_PENDING_SUBMISSIONS) {
        return reply.code(429).send({
          message:
            'Too many pending verification submissions. Complete or withdraw existing submissions first.',
        });
      }

      const submission = await app.prisma.verificationSubmission.create({
        data: {
          userId,
          type: request.body.type,
          status: VerificationStatus.PENDING,
          payload: request.body.payload,
        },
      });

      reply.code(201);
      return {
        submission,
      };
    }
  );

  r.get(
    '/mine',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
    },
    async (request) => {
      const userId = request.jwtUser?.id;
      if (!userId) {
        return {
          submissions: [],
        };
      }

      const submissions = await app.prisma.verificationSubmission.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return { submissions };
    }
  );

  r.get(
    '/admin/queue',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        querystring: adminQueueQuerySchema,
      },
    },
    async (request, reply) => {
      const role = request.jwtUser?.role;
      if (role !== UserRole.ADMIN && role !== UserRole.MODERATOR) {
        return reply.code(403).send({ message: 'Admin privileges required' });
      }

      const { status, type, limit, cursor } = request.query;
      const submissions = await app.prisma.verificationSubmission.findMany({
        where: {
          status: status ?? VerificationStatus.PENDING,
          ...(type ? { type } : {}),
        },
        take: limit,
        ...(cursor
          ? {
              skip: 1,
              cursor: {
                id: cursor,
              },
            }
          : {}),
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              handle: true,
              tier: true,
              verifiedDomains: true,
              verifiedDocs: true,
            },
          },
        },
      });

      return {
        submissions,
        nextCursor: submissions.length === limit ? submissions[submissions.length - 1].id : null,
      };
    }
  );

  r.post(
    '/admin/:id/decision',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        params: submissionIdParamSchema,
        body: adminDecisionSchema,
      },
    },
    async (request, reply) => {
      const role = request.jwtUser?.role;
      if (role !== UserRole.ADMIN && role !== UserRole.MODERATOR) {
        return reply.code(403).send({ message: 'Admin privileges required' });
      }

      const { approve, note, addDomain, institutionId, verifiedDocInc } = request.body;
      const submission = await app.prisma.verificationSubmission.findUnique({
        where: { id: request.params.id },
      });

      if (!submission) {
        return reply.code(404).send({ message: 'Submission not found' });
      }

      if (submission.status !== VerificationStatus.PENDING) {
        return reply.code(400).send({ message: 'Submission already processed' });
      }

      const now = new Date();

      const result = await app.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: submission.userId },
          select: {
            verifiedDomains: true,
            verifiedDocs: true,
          },
        });

        if (!user) {
          throw new Error('Associated user not found');
        }

        const updatedSubmission = await tx.verificationSubmission.update({
          where: { id: submission.id },
          data: {
            status: approve ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
            reviewerId: request.jwtUser?.id,
            reviewedAt: now,
            payload: {
              ...submission.payload,
              adminNote: note,
              decisionAt: now.toISOString(),
            },
          },
        });

        let updatedDomains = user.verifiedDomains ?? [];
        let updatedDocs = user.verifiedDocs ?? 0;

        if (approve) {
          if (addDomain) {
            const nextDomains = new Set(updatedDomains.map((value) => value.toLowerCase()));
            nextDomains.add(addDomain.toLowerCase());
            updatedDomains = Array.from(nextDomains);
            await tx.user.update({
              where: { id: submission.userId },
              data: {
                verifiedDomains: updatedDomains,
              },
            });
          }

          if (institutionId) {
            const roleFromPayload =
              typeof submission.payload?.role === 'string' && submission.payload.role.length > 0
                ? submission.payload.role
                : 'member';

            await tx.userInstitution.upsert({
              where: {
                userId_institutionId_role: {
                  userId: submission.userId,
                  institutionId,
                  role: roleFromPayload,
                },
              },
              update: {
                verified: true,
                proofUri:
                  typeof submission.payload?.proofUri === 'string'
                    ? submission.payload.proofUri
                    : (submission.payload?.proofUrl ?? null),
                endAt:
                  submission.payload?.endAt && typeof submission.payload.endAt === 'string'
                    ? new Date(submission.payload.endAt)
                    : undefined,
              },
              create: {
                userId: submission.userId,
                institutionId,
                role: roleFromPayload,
                verified: true,
                proofUri:
                  typeof submission.payload?.proofUri === 'string'
                    ? submission.payload.proofUri
                    : (submission.payload?.proofUrl ?? null),
                startAt:
                  submission.payload?.startAt && typeof submission.payload.startAt === 'string'
                    ? new Date(submission.payload.startAt)
                    : undefined,
                endAt:
                  submission.payload?.endAt && typeof submission.payload.endAt === 'string'
                    ? new Date(submission.payload.endAt)
                    : undefined,
              },
            });
          }

          if (verifiedDocInc && verifiedDocInc > 0) {
            updatedDocs = (user.verifiedDocs ?? 0) + verifiedDocInc;
            await tx.user.update({
              where: { id: submission.userId },
              data: {
                verifiedDocs: updatedDocs,
              },
            });
          }

          await tx.reputationHistory.create({
            data: {
              userId: submission.userId,
              delta: verifiedDocInc ?? 0,
              reason: `verification-approved:${submission.type}`,
            },
          });
        } else if (note) {
          await tx.reputationHistory.create({
            data: {
              userId: submission.userId,
              delta: 0,
              reason: `verification-rejected:${submission.type}`,
            },
          });
        }

        return {
          updatedSubmission,
          updatedDomains,
          updatedDocs,
        };
      });

      const tierResult = await recalcAndPersistTier(app.prisma, submission.userId);

      return {
        submission: result.updatedSubmission,
        verifiedDomains: result.updatedDomains,
        verifiedDocs: result.updatedDocs,
        tier: tierResult.tier,
        verificationScore: tierResult.score,
      };
    }
  );

  r.post(
    '/endorse/:userId',
    {
      onRequest: [app.authenticate, app.requireNotBanned],
      schema: {
        params: userIdParamSchema,
        body: endorseSchema,
      },
    },
    async (request, reply) => {
      const endorserId = request.jwtUser?.id;
      if (!endorserId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const { userId } = request.params;
      if (endorserId === userId) {
        return reply.code(400).send({ message: 'You cannot endorse yourself' });
      }

      const weight = request.body.weight ?? 1;
      const endorsement = await app.prisma.endorsement.upsert({
        where: {
          endorserId_endorseedId: {
            endorserId,
            endorseedId: userId,
          },
        },
        update: {
          weight,
          note: request.body.note,
        },
        create: {
          endorserId,
          endorseedId: userId,
          weight,
          note: request.body.note,
        },
      });

      return {
        endorsement,
      };
    }
  );

  r.get(
    '/endorse/inbound/:userId',
    {
      schema: {
        params: userIdParamSchema,
      },
    },
    async (request) => {
      const { userId } = request.params;
      const endorsements = await app.prisma.endorsement.findMany({
        where: {
          endorseedId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      const totalWeight = endorsements.reduce((sum, endorsement) => sum + endorsement.weight, 0);
      const count = await app.prisma.endorsement.count({
        where: {
          endorseedId: userId,
        },
      });

      return {
        userId,
        count,
        totalWeight,
        recent: endorsements,
      };
    }
  );
}
