import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  ACTIVITY_FILTER_ACTIONS,
  type ActivityAction,
  type ActivityEvent,
  type ActivityFilter,
  type RecordActivityInput,
} from "../lib/schemas.js";

/** Minimal Prisma surface used here, so tests can pass a stub (or a transaction client). */
export type ActivityDb = Pick<PrismaClient, "planActivity">;

export interface ActivityStore {
  /** Events of plans the caller owns or belongs to, newest first. */
  list(userId: string, tipo?: ActivityFilter): Promise<ActivityEvent[]>;
}

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

export function buildActivityWhere(userId: string, tipo: ActivityFilter): Prisma.PlanActivityWhereInput {
  const and: Prisma.PlanActivityWhereInput[] = [
    {
      OR: [
        { userId },
        { plan: { OR: [{ userId }, { members: { some: { userId } } }] } },
      ],
    },
  ];
  const actions = ACTIVITY_FILTER_ACTIONS[tipo];
  if (actions) and.push({ action: { in: [...actions] } });
  return { AND: and };
}

export async function getUserActivity(
  db: ActivityDb,
  userId: string,
  tipo: ActivityFilter = "todos",
): Promise<ActivityEvent[]> {
  const rows = await db.planActivity.findMany({
    where: buildActivityWhere(userId, tipo),
    orderBy: [{ createdAt: "desc" }],
    include: { user: { select: { name: true } }, plan: { select: { estado: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action as ActivityAction,
    planId: row.planId,
    planTitle: row.planTitle,
    previousState: row.previousState,
    newState: row.newState,
    planEstado: row.plan?.estado ?? null,
    actorName: row.user.name,
    createdAt: row.createdAt,
  }));
}

export function createPrismaActivityStore(): ActivityStore {
  return { list: (userId, tipo) => getUserActivity(prisma, userId, tipo) };
}
