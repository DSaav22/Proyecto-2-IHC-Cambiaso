ALTER TABLE "Plan"
ADD COLUMN "winningDateOptionId" TEXT,
ADD COLUMN "winningPlaceOptionId" TEXT,
ADD COLUMN "decisionReason" TEXT,
ADD COLUMN "decidedAt" TIMESTAMP(3),
ADD COLUMN "decidedBy" TEXT;

CREATE INDEX "Plan_winningDateOptionId_idx" ON "Plan"("winningDateOptionId");
CREATE INDEX "Plan_winningPlaceOptionId_idx" ON "Plan"("winningPlaceOptionId");
CREATE INDEX "Plan_decidedBy_idx" ON "Plan"("decidedBy");

ALTER TABLE "Plan"
ADD CONSTRAINT "Plan_winningDateOptionId_fkey"
FOREIGN KEY ("winningDateOptionId") REFERENCES "PlanOption"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Plan"
ADD CONSTRAINT "Plan_winningPlaceOptionId_fkey"
FOREIGN KEY ("winningPlaceOptionId") REFERENCES "PlanOption"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Plan"
ADD CONSTRAINT "Plan_decidedBy_fkey"
FOREIGN KEY ("decidedBy") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
