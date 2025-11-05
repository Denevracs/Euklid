import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tier, UserRole, VerificationStatus, VerificationType } from '@prisma/client';
import verificationRoutes from '../../routes/verification';

import type * as TierModule from '../../services/tier';
type TierModuleType = typeof TierModule;

type TransactionClient = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  verificationSubmission: {
    update: ReturnType<typeof vi.fn>;
  };
  userInstitution: {
    upsert: ReturnType<typeof vi.fn>;
  };
  reputationHistory: {
    create: ReturnType<typeof vi.fn>;
  };
};

type PrismaMock = {
  verificationSubmission: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  userInstitution: {
    upsert: ReturnType<typeof vi.fn>;
  };
  reputationHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  endorsement: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const { recalcMock } = vi.hoisted(() => ({
  recalcMock: vi.fn(),
}));

vi.mock('../../services/tier', async (importActual) => {
  const actual = (await importActual()) as unknown as TierModuleType;
  return {
    ...actual,
    recalcAndPersistTier: recalcMock,
  };
});

const buildApp = (prisma: PrismaMock) => {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const baseUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'User Example',
    handle: 'user-example',
    tier: Tier.TIER3,
    role: UserRole.MEMBER,
    isHistorical: false,
    verifiedDomains: [],
    verifiedDocs: 0,
  };

  const adminUser = {
    ...baseUser,
    id: 'admin-123',
    role: UserRole.ADMIN,
  };

  app.decorate('prisma', prisma);

  app.decorate('authenticate', async function authenticate(request) {
    const userHeader = request.headers['x-test-user'];
    if (userHeader === 'admin') {
      request.jwtUser = adminUser;
      request.user = adminUser;
      return;
    }

    request.jwtUser = baseUser;
    request.user = baseUser;
  });

  app.decorate('requireNotBanned', async () => undefined);

  void app.register(verificationRoutes, { prefix: '/verification' });

  return { app, baseUser, adminUser };
};

describe('verification routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submission flow', () => {
    const submissionId = '11111111-2222-4333-8444-555555555555';
    let prismaMock: PrismaMock;
    let app: ReturnType<typeof Fastify>;

    beforeEach(async () => {
      const txUserFindUnique = vi.fn().mockResolvedValue({
        verifiedDomains: ['mit.edu'],
        verifiedDocs: 1,
      });
      const txUserUpdate = vi.fn();
      const txSubmissionUpdate = vi.fn().mockResolvedValue({
        id: submissionId,
        userId: 'user-123',
        type: VerificationType.DOCUMENT_ORG,
        status: VerificationStatus.APPROVED,
        payload: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const txUserInstitutionUpsert = vi.fn();
      const txReputationHistoryCreate = vi.fn();

      const transactionClient: TransactionClient = {
        user: {
          findUnique: txUserFindUnique,
          update: txUserUpdate,
        },
        verificationSubmission: {
          update: txSubmissionUpdate,
        },
        userInstitution: {
          upsert: txUserInstitutionUpsert,
        },
        reputationHistory: {
          create: txReputationHistoryCreate,
        },
      };

      prismaMock = {
        verificationSubmission: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({
            id: submissionId,
            userId: 'user-123',
            type: VerificationType.DOCUMENT_ORG,
            status: VerificationStatus.PENDING,
            payload: { institutionId: 'inst-1' },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue({
            id: submissionId,
            userId: 'user-123',
            type: VerificationType.DOCUMENT_ORG,
            status: VerificationStatus.PENDING,
            payload: { role: 'researcher', proofUri: 'https://example.com/proof.pdf' },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        userInstitution: {
          upsert: vi.fn(),
        },
        reputationHistory: {
          create: vi.fn(),
        },
        endorsement: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          upsert: vi.fn().mockResolvedValue({
            id: 'endorsement-1',
            endorserId: 'admin-123',
            endorseedId: 'user-123',
            weight: 3,
            note: 'Great collaborator',
            createdAt: new Date(),
          }),
        },
        $transaction: vi.fn(async (callback: (client: TransactionClient) => Promise<unknown>) =>
          callback(transactionClient)
        ),
      } satisfies PrismaMock;

      recalcMock.mockResolvedValue({ tier: Tier.TIER2, score: 70, verifiedAt: new Date() });

      const setup = buildApp(prismaMock);
      app = setup.app;
      await app.ready();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('allows members to submit verification requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/verification/submit',
        payload: {
          type: VerificationType.DOCUMENT_ORG,
          payload: { institutionId: 'inst-1', proofUri: 'https://example.com/proof.pdf' },
        },
      });

      expect(response.statusCode).toBe(201);
      expect(prismaMock.verificationSubmission.create).toHaveBeenCalled();
    });

    it('allows admins to approve verification submissions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/verification/admin/${submissionId}/decision`,
        headers: {
          'x-test-user': 'admin',
        },
        payload: {
          approve: true,
          note: 'Looks good',
          addDomain: 'harvard.edu',
          institutionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          verifiedDocInc: 1,
        },
      });

      const body = response.json();
      expect(response.statusCode, JSON.stringify(body)).toBe(200);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(recalcMock).toHaveBeenCalledWith(prismaMock, 'user-123');
      expect(body.tier).toBe(Tier.TIER2);
      expect(body.verifiedDocs).toBeDefined();
    });
  });
});
