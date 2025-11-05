-- Stage 4 / Stage 2: tier inference + verification pipeline

-- Helper to create enums only when missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationType') THEN
    CREATE TYPE "VerificationType" AS ENUM ('EMAIL_DOMAIN', 'INSTITUTION_ID', 'DOCUMENT_ORG', 'PEER_ENDORSE', 'ORCID', 'SCHOLAR_PROFILE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationTargetType') THEN
    CREATE TYPE "ModerationTargetType" AS ENUM ('DISCUSSION', 'REPLY', 'USER', 'EVIDENCE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationAction') THEN
    CREATE TYPE "ModerationAction" AS ENUM ('HIDE', 'FLAG', 'BAN', 'NOTE');
  END IF;
END
$$;

-- Extend users with verification tracking
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "verificationScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastTierEvalAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "affiliations" JSONB,
  ADD COLUMN IF NOT EXISTS "banReason" TEXT,
  ALTER COLUMN "verifiedDomains" SET DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "User_lastTierEvalAt_idx" ON "User"("lastTierEvalAt");
CREATE INDEX IF NOT EXISTS "User_tier_idx" ON "User"("tier");

-- Verification submissions captured for review
CREATE TABLE IF NOT EXISTS "VerificationSubmission" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "type" "VerificationType" NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VerificationSubmission_userId_status_type_idx"
  ON "VerificationSubmission"("userId", "status", "type");

-- Peer endorsements for collaborative reputation
CREATE TABLE IF NOT EXISTS "Endorsement" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "endorserId" TEXT NOT NULL,
  "endorseedId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Endorsement_endorserId_endorseedId_key"
  ON "Endorsement"("endorserId", "endorseedId");
CREATE INDEX IF NOT EXISTS "Endorsement_endorseedId_idx"
  ON "Endorsement"("endorseedId");

-- Institution catalogue to support verified affiliations
CREATE TABLE IF NOT EXISTS "Institution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL UNIQUE,
  "kind" TEXT NOT NULL,
  "reputation" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mapping users to institutions with proof
CREATE TABLE IF NOT EXISTS "UserInstitution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "proofUri" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInstitution_userId_institutionId_role_key"
  ON "UserInstitution"("userId", "institutionId", "role");

-- Foreign keys (guarded for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VerificationSubmission_userId_fkey'
  ) THEN
    ALTER TABLE "VerificationSubmission"
    ADD CONSTRAINT "VerificationSubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VerificationSubmission_reviewerId_fkey'
  ) THEN
    ALTER TABLE "VerificationSubmission"
    ADD CONSTRAINT "VerificationSubmission_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Endorsement_endorserId_fkey'
  ) THEN
    ALTER TABLE "Endorsement"
    ADD CONSTRAINT "Endorsement_endorserId_fkey"
    FOREIGN KEY ("endorserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Endorsement_endorseedId_fkey'
  ) THEN
    ALTER TABLE "Endorsement"
    ADD CONSTRAINT "Endorsement_endorseedId_fkey"
    FOREIGN KEY ("endorseedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserInstitution_userId_fkey'
  ) THEN
    ALTER TABLE "UserInstitution"
    ADD CONSTRAINT "UserInstitution_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserInstitution_institutionId_fkey'
  ) THEN
    ALTER TABLE "UserInstitution"
    ADD CONSTRAINT "UserInstitution_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Reputation history table captures tier adjustments; ensure presence
CREATE TABLE IF NOT EXISTS "ReputationHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ReputationHistory_userId_idx"
  ON "ReputationHistory"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ReputationHistory_userId_fkey'
  ) THEN
    ALTER TABLE "ReputationHistory"
    ADD CONSTRAINT "ReputationHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Follow graph (Stage 2 ensures presence for tier-aware feeds)
CREATE TABLE IF NOT EXISTS "Follow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key"
  ON "Follow"("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"
  ON "Follow"("followerId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx"
  ON "Follow"("followingId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Follow_followerId_fkey'
  ) THEN
    ALTER TABLE "Follow"
    ADD CONSTRAINT "Follow_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Follow_followingId_fkey'
  ) THEN
    ALTER TABLE "Follow"
    ADD CONSTRAINT "Follow_followingId_fkey"
    FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Moderation events audit log (ensure optional presence)
CREATE TABLE IF NOT EXISTS "ModerationEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" TEXT NOT NULL,
  "targetType" "ModerationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" "ModerationAction" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ModerationEvent_actorId_fkey'
  ) THEN
    ALTER TABLE "ModerationEvent"
    ADD CONSTRAINT "ModerationEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
