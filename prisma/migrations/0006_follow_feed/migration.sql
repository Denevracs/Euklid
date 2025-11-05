-- Stage 4 / Stage 3: follow graph and feed integration

-- Extend ActivityAction enum with new engagement verbs (idempotent guards)
DO $$
BEGIN
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CREATE_NODE';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'UPDATE_NODE';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ADD_EVIDENCE';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CREATE_DISCUSSION';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'REPLY';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'VOTE';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CONTRADICT';
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'ENDORSE';
END
$$;

-- Activity table: support richer targets and scoring
ALTER TABLE "Activity"
  ALTER COLUMN "targetNodeId" DROP NOT NULL;

ALTER TABLE "Activity"
  ADD COLUMN IF NOT EXISTS "targetDiscussionId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetDisciplineId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetEvidenceId" TEXT,
  ADD COLUMN IF NOT EXISTS "weight" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity"("createdAt");
CREATE INDEX IF NOT EXISTS "Activity_targetDiscussionId_idx" ON "Activity"("targetDiscussionId");
CREATE INDEX IF NOT EXISTS "Activity_targetUserId_idx" ON "Activity"("targetUserId");
CREATE INDEX IF NOT EXISTS "Activity_targetDisciplineId_idx" ON "Activity"("targetDisciplineId");
CREATE INDEX IF NOT EXISTS "Activity_targetEvidenceId_idx" ON "Activity"("targetEvidenceId");

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_targetDiscussionId_fkey";
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_targetDiscussionId_fkey"
  FOREIGN KEY ("targetDiscussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_targetUserId_fkey";
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_targetDisciplineId_fkey";
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_targetDisciplineId_fkey"
  FOREIGN KEY ("targetDisciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_targetEvidenceId_fkey";
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_targetEvidenceId_fkey"
  FOREIGN KEY ("targetEvidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Follow table evolves to support user and discipline follows
ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followingId_fkey";
ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followerId_followingId_key";

ALTER TABLE "Follow" ADD COLUMN IF NOT EXISTS "followeeUserId" TEXT;
ALTER TABLE "Follow" ADD COLUMN IF NOT EXISTS "followDisciplineId" TEXT;
ALTER TABLE "Follow" DROP COLUMN IF EXISTS "followingId";
ALTER TABLE "Follow" ALTER COLUMN "followeeUserId" DROP NOT NULL;

ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followeeUserId_fkey";
ALTER TABLE "Follow"
  ADD CONSTRAINT "Follow_followeeUserId_fkey"
  FOREIGN KEY ("followeeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followDisciplineId_fkey";
ALTER TABLE "Follow"
  ADD CONSTRAINT "Follow_followDisciplineId_fkey"
  FOREIGN KEY ("followDisciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Follow_followingId_idx";
CREATE INDEX IF NOT EXISTS "Follow_followeeUserId_idx" ON "Follow"("followeeUserId");
CREATE INDEX IF NOT EXISTS "Follow_followDisciplineId_idx" ON "Follow"("followDisciplineId");

ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_user_or_discipline_chk";
ALTER TABLE "Follow"
  ADD CONSTRAINT "Follow_user_or_discipline_chk"
  CHECK (
    ("followeeUserId" IS NOT NULL AND "followDisciplineId" IS NULL) OR
    ("followeeUserId" IS NULL AND "followDisciplineId" IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_unique_user"
  ON "Follow"("followerId", "followeeUserId")
  WHERE "followeeUserId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_unique_discipline"
  ON "Follow"("followerId", "followDisciplineId")
  WHERE "followDisciplineId" IS NOT NULL;

-- Feed cache table for personalized results
CREATE TABLE IF NOT EXISTS "FeedItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "refId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "FeedItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FeedItem_ownerId_createdAt_idx" ON "FeedItem"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedItem_ownerId_score_idx" ON "FeedItem"("ownerId", "score");

-- Supplemental indexes to speed feed queries
CREATE INDEX IF NOT EXISTS "Node_createdAt_idx" ON "Node"("createdAt");
CREATE INDEX IF NOT EXISTS "Node_updatedAt_idx" ON "Node"("updatedAt");
CREATE INDEX IF NOT EXISTS "Node_createdById_idx" ON "Node"("createdById");
CREATE INDEX IF NOT EXISTS "Node_disciplineId_idx" ON "Node"("disciplineId");

CREATE INDEX IF NOT EXISTS "Discussion_createdAt_idx" ON "Discussion"("createdAt");
CREATE INDEX IF NOT EXISTS "Discussion_authorId_idx" ON "Discussion"("authorId");
CREATE INDEX IF NOT EXISTS "Discussion_nodeId_idx" ON "Discussion"("nodeId");

CREATE INDEX IF NOT EXISTS "Discipline_createdAt_idx" ON "Discipline"("createdAt");

CREATE INDEX IF NOT EXISTS "Evidence_createdAt_idx" ON "Evidence"("createdAt");
CREATE INDEX IF NOT EXISTS "Vote_createdAt_idx" ON "Vote"("createdAt");
CREATE INDEX IF NOT EXISTS "Endorsement_createdAt_idx" ON "Endorsement"("createdAt");

-- Ensure follower index exists with consistent naming
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId");
