-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "shareCode" TEXT;

-- Populate shareCode for existing rows
UPDATE "Plan" SET "shareCode" = 'PLZ-' || UPPER(SUBSTRING(REPLACE("id", '-', ''), 1, 6)) WHERE "shareCode" IS NULL;

-- Make shareCode NOT NULL
ALTER TABLE "Plan" ALTER COLUMN "shareCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_shareCode_key" ON "Plan"("shareCode");

-- CreateTable
CREATE TABLE "PlanMember" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanMember_planId_userId_key" ON "PlanMember"("planId", "userId");

-- CreateIndex
CREATE INDEX "PlanMember_userId_idx" ON "PlanMember"("userId");

-- AddForeignKey
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
