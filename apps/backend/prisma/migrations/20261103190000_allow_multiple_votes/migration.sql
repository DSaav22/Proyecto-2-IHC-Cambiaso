-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "votingClosedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "PlanVote_planId_userId_key";

-- DropIndex
DROP INDEX "PlanVote_optionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PlanVote_optionId_userId_key" ON "PlanVote"("optionId", "userId");

-- CreateIndex
CREATE INDEX "PlanVote_planId_userId_idx" ON "PlanVote"("planId", "userId");
