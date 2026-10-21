import type { Prisma, PrismaClient } from "@prisma/client";
import type { RecordActivityInput } from "../lib/schemas.js";

/** Minimal Prisma surface used here, so tests can pass a stub (or a transaction client). */
export type ActivityDb = Pick<PrismaClient, "planActivity">;

/**
 * Persists one activity event. Logging is best effort: a failure is reported but never thrown,
 * so it cannot abort the plan operation that triggered it.
 */
export async function recordActivity(db: ActivityDb, input: RecordActivityInput): Promise<void> {
  try {
    await db.planActivity.create({
      data: {
        planId: input.planId,
        userId: input.userId,
        planTitle: input.planTitle,
        action: input.action,
        previousState: input.previousState ?? null,
        newState: input.newState ?? null,
        details: (input.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la actividad del plan", error);
  }
}
