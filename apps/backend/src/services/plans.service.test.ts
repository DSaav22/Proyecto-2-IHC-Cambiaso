import { describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("../lib/prisma.js", () => ({ prisma: { plan: { findMany } } }));

import {
  buildPlanWhere,
  computePlanSummary,
  createPrismaPlansStore,
  escapeLikePattern,
  toUtcDate,
  boliviaToday,
} from "./plans.service.js";

const today = toUtcDate("2026-06-15");
const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const scope = (userId: string) => ({ OR: [{ userId }, { members: { some: { userId } } }] });
const clauses = (where: ReturnType<typeof buildPlanWhere>) => where.AND as unknown[];

describe("toUtcDate", () => {
  it("converts YYYY-MM-DD to UTC midnight", () => {
    expect(toUtcDate("2026-06-15").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("boliviaToday", () => {
  it("keeps the previous Bolivia day when UTC has already rolled over", () => {
    // 02:00 UTC on Jun 16 is 22:00 on Jun 15 in La Paz (UTC-4)
    expect(boliviaToday(new Date("2026-06-16T02:00:00.000Z"))).toBe("2026-06-15");
  });

  it("returns the same day at midday", () => {
    expect(boliviaToday(new Date("2026-06-15T16:00:00.000Z"))).toBe("2026-06-15");
  });

  it("rolls over at 04:00 UTC (midnight in Bolivia)", () => {
    expect(boliviaToday(new Date("2026-06-16T03:59:59.000Z"))).toBe("2026-06-15");
    expect(boliviaToday(new Date("2026-06-16T04:00:00.000Z"))).toBe("2026-06-16");
  });

  it("does not shift with the season (Bolivia has no DST)", () => {
    expect(boliviaToday(new Date("2026-01-01T03:00:00.000Z"))).toBe("2025-12-31");
  });
});

describe("buildPlanWhere", () => {
  it("puts the owner-or-member scope first and nothing else without filters", () => {
    expect(buildPlanWhere("u1", {}, today)).toEqual({ AND: [scope("u1")] });
  });

  it("always scopes to owned and joined plans, whatever the filters", () => {
    const where = buildPlanWhere("guest", { q: "x", estado: "pendiente", fecha: "next7" }, today);
    expect(clauses(where)[0]).toEqual(scope("guest"));
  });

  it("searches the title only with a case-insensitive contains", () => {
    const where = buildPlanWhere("u1", { q: "Cena" }, today);
    expect(clauses(where)).toContainEqual({ titulo: { contains: "Cena", mode: "insensitive" } });
    expect(JSON.stringify(where)).not.toContain("description");
  });

  it("filters by estado and keeps cancelled plans when estado is cancelado", () => {
    const where = buildPlanWhere("u1", { estado: "cancelado", fecha: "overdue" }, today);
    expect(clauses(where)).toContainEqual({ estado: "cancelado" });
    expect(clauses(where)).not.toContainEqual({ estado: { not: "cancelado" } });
  });

  it("builds the today range as a single day", () => {
    const where = buildPlanWhere("u1", { fecha: "today" }, today);
    expect(clauses(where)).toContainEqual({ dueDate: { gte: today, lte: today } });
  });

  it("includes day 0 and day 7 and excludes day 8 for next7", () => {
    const where = buildPlanWhere("u1", { fecha: "next7" }, today);
    expect(clauses(where)).toContainEqual({ dueDate: { gte: today, lte: day("2026-06-22") } });
  });

  it("builds the next30 range from today to today plus 30 days", () => {
    const where = buildPlanWhere("u1", { fecha: "next30" }, today);
    expect(clauses(where)).toContainEqual({ dueDate: { gte: today, lte: day("2026-07-15") } });
  });

  it("treats only dates before today as overdue (yesterday in, today out)", () => {
    const where = buildPlanWhere("u1", { fecha: "overdue" }, today);
    expect(clauses(where)).toContainEqual({ dueDate: { lt: today } });
  });

  it("excludes cancelled plans when a date filter is set without estado", () => {
    for (const fecha of ["today", "next7", "next30", "overdue"] as const) {
      const where = buildPlanWhere("u1", { fecha }, today);
      expect(clauses(where), fecha).toContainEqual({ estado: { not: "cancelado" } });
    }
  });

  it("does not exclude cancelled plans when no date filter is set", () => {
    const where = buildPlanWhere("u1", { q: "a" }, today);
    expect(clauses(where)).not.toContainEqual({ estado: { not: "cancelado" } });
  });

  it("combines search, estado and date clauses in one AND", () => {
    const where = buildPlanWhere("u1", { q: "a", estado: "confirmado", fecha: "next7" }, today);
    expect(clauses(where)).toHaveLength(4);
  });
});

describe("escapeLikePattern and literal search", () => {
  it("escapes percent, underscore and backslash with a backslash", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("c:\\d")).toBe("c:\\\\d");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("Cena de Navidad")).toBe("Cena de Navidad");
  });

  it("passes the escaped term to contains so % and _ are literal", () => {
    const where = buildPlanWhere("u1", { q: "50%_off" }, today);
    expect(clauses(where)).toContainEqual({
      titulo: { contains: "50\\%\\_off", mode: "insensitive" },
    });
  });

  it("does not alter the filter when q is absent", () => {
    expect(clauses(buildPlanWhere("u1", {}, today))).toHaveLength(1);
  });
});

describe("computePlanSummary", () => {
  it("counts every plan in total, cancelled included", () => {
    const rows = [
      { dueDate: day("2026-06-20"), estado: "pendiente" },
      { dueDate: day("2026-06-01"), estado: "cancelado" },
    ];
    expect(computePlanSummary(rows, today).total).toBe(2);
  });

  it("excludes cancelled plans from overdue", () => {
    const rows = [
      { dueDate: day("2026-06-14"), estado: "pendiente" },
      { dueDate: day("2026-06-10"), estado: "cancelado" },
      { dueDate: day("2026-06-15"), estado: "pendiente" },
    ];
    expect(computePlanSummary(rows, today).overdue).toBe(1);
  });

  it("picks the earliest non-cancelled due date from today onwards", () => {
    const rows = [
      { dueDate: day("2026-06-16"), estado: "cancelado" },
      { dueDate: day("2026-06-30"), estado: "confirmado" },
      { dueDate: day("2026-06-18"), estado: "pendiente" },
      { dueDate: day("2026-06-01"), estado: "pendiente" },
    ];
    expect(computePlanSummary(rows, today).nextDueDate).toEqual(day("2026-06-18"));
  });

  it("returns today as the next due date when a plan is due today", () => {
    const rows = [{ dueDate: day("2026-06-15"), estado: "pendiente" }];
    expect(computePlanSummary(rows, today).nextDueDate).toEqual(today);
  });

  it("returns a null next date when only cancelled or past plans exist", () => {
    const rows = [
      { dueDate: day("2026-06-20"), estado: "cancelado" },
      { dueDate: day("2026-06-01"), estado: "pendiente" },
    ];
    expect(computePlanSummary(rows, today)).toEqual({ total: 2, overdue: 1, nextDueDate: null });
  });

  it("returns zeros for no plans", () => {
    expect(computePlanSummary([], today)).toEqual({ total: 0, overdue: 0, nextDueDate: null });
  });
});

describe("createPrismaPlansStore list and summary", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const row = {
    id: "p1",
    userId: "u1",
    titulo: "Cena",
    description: "d",
    dueDate: day("2026-06-20"),
    estado: "pendiente",
    createdAt,
    shareCode: "PLZ-AAAAAA",
    user: { name: "Ana" },
  };

  it("lists with the scoped where built from the filter and keeps the order", async () => {
    findMany.mockResolvedValueOnce([row]);
    const plans = await createPrismaPlansStore().list("u1", { q: "ce", fecha: "next7" }, today);
    const args = findMany.mock.calls.at(-1)![0];
    expect(args.where).toEqual(buildPlanWhere("u1", { q: "ce", fecha: "next7" }, today));
    expect(args.orderBy).toEqual([{ dueDate: "asc" }, { createdAt: "asc" }]);
    expect(plans[0]).toMatchObject({ id: "p1", isOwner: true, ownerName: "Ana" });
  });

  it("lists without a filter using only the scope clause", async () => {
    findMany.mockResolvedValueOnce([]);
    await createPrismaPlansStore().list("u1");
    expect(findMany.mock.calls.at(-1)![0].where).toEqual({ AND: [scope("u1")] });
  });

  it("summarizes the unfiltered scope selecting only dueDate and estado", async () => {
    findMany.mockResolvedValueOnce([
      { dueDate: day("2026-06-10"), estado: "pendiente" },
      { dueDate: day("2026-06-16"), estado: "confirmado" },
      { dueDate: day("2026-06-12"), estado: "cancelado" },
    ]);
    const summary = await createPrismaPlansStore().summary("u1", today);
    const args = findMany.mock.calls.at(-1)![0];
    expect(args.select).toEqual({ dueDate: true, estado: true });
    expect(args.where).toEqual({ AND: [scope("u1")] });
    expect(summary).toEqual({ total: 3, overdue: 1, nextDueDate: day("2026-06-16") });
  });

  it("returns an empty summary when the user has no plans", async () => {
    findMany.mockResolvedValueOnce([]);
    expect(await createPrismaPlansStore().summary("u1", today)).toEqual({
      total: 0,
      overdue: 0,
      nextDueDate: null,
    });
  });
});
