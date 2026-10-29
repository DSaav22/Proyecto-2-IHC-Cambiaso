-- CreateTable
CREATE TABLE "PlanOption" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVote" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanOption_planId_idx" ON "PlanOption"("planId");

-- CreateIndex
CREATE INDEX "PlanVote_optionId_idx" ON "PlanVote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVote_planId_userId_key" ON "PlanVote"("planId", "userId");

-- AddForeignKey
ALTER TABLE "PlanOption" ADD CONSTRAINT "PlanOption_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanOption" ADD CONSTRAINT "PlanOption_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVote" ADD CONSTRAINT "PlanVote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVote" ADD CONSTRAINT "PlanVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PlanOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVote" ADD CONSTRAINT "PlanVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
