/*
  Warnings:

  - A unique constraint covering the columns `[handle]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BookSlug" AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'OTHER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'CONTRIBUTOR', 'REVIEWER', 'CURATOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('TIER1', 'TIER2', 'TIER3', 'TIER4');

-- CreateEnum
CREATE TYPE "Stance" AS ENUM ('PROVEN', 'DISPROVEN', 'PROBABILISTIC');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('ACK', 'INSIGHT', 'ISSUE', 'CHECKED');

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "disciplineId" TEXT,
ADD COLUMN     "stance" "Stance" NOT NULL DEFAULT 'PROBABILISTIC';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "display" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "isHistorical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" "Tier" NOT NULL DEFAULT 'TIER4';

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "slug" "BookSlug" NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Derivation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Derivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "nodeId" TEXT,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReputation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "disciplineId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsensusVote" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "stance" "Stance" NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsensusVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsensusSnapshot" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "Stance" NOT NULL,
    "tallies" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsensusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GhostReservation" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "primaryYears" TEXT,
    "bioShort" TEXT,
    "maintainerId" TEXT,

    CONSTRAINT "GhostReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_nodeId_idx" ON "Note"("nodeId");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "Reaction_noteId_idx" ON "Reaction"("noteId");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE INDEX "UserReputation_userId_idx" ON "UserReputation"("userId");

-- CreateIndex
CREATE INDEX "UserReputation_disciplineId_idx" ON "UserReputation"("disciplineId");

-- CreateIndex
CREATE INDEX "ConsensusVote_nodeId_idx" ON "ConsensusVote"("nodeId");

-- CreateIndex
CREATE INDEX "ConsensusVote_voterId_idx" ON "ConsensusVote"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsensusVote_nodeId_voterId_key" ON "ConsensusVote"("nodeId", "voterId");

-- CreateIndex
CREATE INDEX "ConsensusSnapshot_nodeId_idx" ON "ConsensusSnapshot"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "GhostReservation_handle_key" ON "GhostReservation"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Derivation" ADD CONSTRAINT "Derivation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Derivation" ADD CONSTRAINT "Derivation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReputation" ADD CONSTRAINT "UserReputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReputation" ADD CONSTRAINT "UserReputation_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsensusVote" ADD CONSTRAINT "ConsensusVote_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsensusVote" ADD CONSTRAINT "ConsensusVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsensusSnapshot" ADD CONSTRAINT "ConsensusSnapshot_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostReservation" ADD CONSTRAINT "GhostReservation_maintainerId_fkey" FOREIGN KEY ("maintainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
