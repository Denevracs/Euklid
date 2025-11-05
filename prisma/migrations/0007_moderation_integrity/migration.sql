-- Stage 4 / Stage 4: moderation integrity

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "warningsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mutesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bansCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastActionAt" TIMESTAMP(3);

ALTER TABLE "ModerationEvent"
  ADD COLUMN IF NOT EXISTS "targetUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "weight" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

ALTER TABLE "ModerationEvent"
  ALTER COLUMN "targetType" TYPE TEXT USING "targetType"::TEXT,
  ALTER COLUMN "action" TYPE TEXT USING "action"::TEXT;

CREATE INDEX IF NOT EXISTS "ModerationEvent_targetUserId_idx" ON "ModerationEvent"("targetUserId");
CREATE INDEX IF NOT EXISTS "ModerationEvent_action_idx" ON "ModerationEvent"("action");

ALTER TABLE "ModerationEvent" DROP CONSTRAINT IF EXISTS "ModerationEvent_targetUserId_fkey";
ALTER TABLE "ModerationEvent"
  ADD CONSTRAINT "ModerationEvent_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Flag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  CONSTRAINT "Flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Flag_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Flag_unique_report" ON "Flag"("reporterId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS "Flag_status_idx" ON "Flag"("status");

DROP TYPE IF EXISTS "ModerationTargetType";
DROP TYPE IF EXISTS "ModerationAction";
