-- Rename plan state borrador -> pendiente (SM-08).
-- Rollback (manual, Prisma has no down migrations):
--   UPDATE "Plan" SET "estado" = 'borrador' WHERE "estado" = 'pendiente';
--   ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'borrador';
UPDATE "Plan" SET "estado" = 'pendiente' WHERE "estado" = 'borrador';

ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'pendiente';
