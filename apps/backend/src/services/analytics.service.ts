import { EVENT_NAMES, type EventName, type EventProps } from "../lib/analytics.js";
import { prisma } from "../lib/prisma.js";

export async function recordEvent(event: EventName, props: EventProps) {
  await prisma.analyticsEvent.create({ data: { event, props } });
}

export async function getAnalyticsSummary() {
  const grouped = await prisma.analyticsEvent.groupBy({ by: ["event"], _count: { _all: true } });
  const reasons = await prisma.$queryRaw<{ event: string; motivo: string; count: number }[]>`
    SELECT event, props->>'motivo' AS motivo, COUNT(*)::int AS count
    FROM eventos
    WHERE props ? 'motivo'
    GROUP BY event, motivo
    ORDER BY count DESC`;
  const recent = await prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

  const counts: Record<string, number> = Object.fromEntries(EVENT_NAMES.map((name) => [name, 0]));
  for (const row of grouped) counts[row.event] = row._count._all;

  return { counts, reasons, recent };
}
