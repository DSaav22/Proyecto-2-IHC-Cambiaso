-- CreateTable
CREATE TABLE "PlanInvitation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanInvitation_userId_idx" ON "PlanInvitation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanInvitation_planId_userId_key" ON "PlanInvitation"("planId", "userId");

-- AddForeignKey
ALTER TABLE "PlanInvitation" ADD CONSTRAINT "PlanInvitation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInvitation" ADD CONSTRAINT "PlanInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInvitation" ADD CONSTRAINT "PlanInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
