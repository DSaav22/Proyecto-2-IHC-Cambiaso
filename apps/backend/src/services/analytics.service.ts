import { completionRate, type EventName } from "../lib/analytics.js";
import { prisma } from "../lib/prisma.js";

export async function recordEvent(event: EventName, props: Record<string, string>) {
  await prisma.analyticsEvent.create({ data: { event, props } });
}

export async function getAnalyticsSummary() {
  const grouped = await prisma.analyticsEvent.groupBy({ by: ["event"], _count: { _all: true } });
  const recent = await prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

  const counts: Record<string, number> = { plan_creacion_iniciada: 0, plan_confirmado: 0 };
  for (const row of grouped) counts[row.event] = row._count._all;

  return {
    counts,
    completionRate: completionRate(counts.plan_creacion_iniciada, counts.plan_confirmado),
    recent,
  };
}
