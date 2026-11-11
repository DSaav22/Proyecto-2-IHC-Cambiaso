-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "props" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_event_idx" ON "eventos"("event");

-- CreateIndex
CREATE INDEX "eventos_createdAt_idx" ON "eventos"("createdAt" DESC);
