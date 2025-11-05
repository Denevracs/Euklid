-- Stage 4 / Stage 1: authentication foundation

-- Extend the user role enum with moderator tier
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

-- Align user verification columns with new auth design
ALTER TABLE "User"
DROP COLUMN IF EXISTS "verifiedDomains",
ADD COLUMN     "verifiedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User"
DROP COLUMN IF EXISTS "verifiedDocs",
ADD COLUMN     "verifiedDocs" INTEGER NOT NULL DEFAULT 0;

-- Ensure a handle column exists and is unique
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "handle" TEXT;

-- Ensure bannedUntil column exists for moderation bans
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3);

-- Historical flag defaults (safety in case older databases missed it)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false;

-- Indexes for tier/role/banned lookups
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_tier_idx" ON "User"("tier");
CREATE INDEX IF NOT EXISTS "User_bannedUntil_idx" ON "User"("bannedUntil");

-- Unique constraint for handle (idempotent guard)
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");
