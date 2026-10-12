import { afterEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "../api/client";
import {
  DATE_FILTER_LABELS,
  filterPlans,
  hasActiveFilters,
  INITIAL_PLAN_FILTERS,
  parsePlanFilters,
  serializePlanFilters,
  toPlanListParams,
} from "./planFilters";

const mockNow = new Date("2026-10-15T12:00:00.000Z");

const plans: Plan[] = [
  {
    id: "1",
    titulo: "Cena con amigos",
    description: "Cena en restaurante",
    dueDate: "2026-10-15", // Hoy (0 days)
    estado: "confirmado",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "2",
    titulo: "Viaje a la playa",
    description: "Fin de semana",
    dueDate: "2026-10-20", // En 5 días (next7 & next30)
    estado: "pendiente",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "3",
    titulo: "Cena de cumpleaños",
    description: "Celebración especial",
    dueDate: "2026-10-30", // En 15 días (next30)
    estado: "confirmado",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "4",
    titulo: "Concierto de rock",
    description: "Boletos comprados",
    dueDate: "2026-10-10", // Vencido (-5 days)
    estado: "cancelado",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

describe("planFilters", () => {
  it("returns all plans when initial filters are active", () => {
    expect(hasActiveFilters(INITIAL_PLAN_FILTERS)).toBe(false);
    const result = filterPlans(plans, INITIAL_PLAN_FILTERS, mockNow);
    expect(result).toHaveLength(4);
  });

  it("filters plans by title query case-insensitively and trimmed", () => {
    const result = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, query: "  CENA  " }, mockNow);
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("filters plans by status", () => {
    const drafts = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, status: "pendiente" }, mockNow);
    expect(drafts.map((p) => p.id)).toEqual(["2"]);

    const cancelled = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, status: "cancelado" }, mockNow);
    expect(cancelled.map((p) => p.id)).toEqual(["4"]);
  });

  it("filters plans by date intervals (today, next7, next30, overdue)", () => {
    const todayPlans = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, dateRange: "today" }, mockNow);
    expect(todayPlans.map((p) => p.id)).toEqual(["1"]);

    const next7Plans = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, dateRange: "next7" }, mockNow);
    expect(next7Plans.map((p) => p.id)).toEqual(["1", "2"]);

    const next30Plans = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, dateRange: "next30" }, mockNow);
    expect(next30Plans.map((p) => p.id)).toEqual(["1", "2", "3"]);

    const overduePlans = filterPlans(plans, { ...INITIAL_PLAN_FILTERS, dateRange: "overdue" }, mockNow);
    expect(overduePlans.map((p) => p.id)).toEqual(["4"]);
  });

  it("combines title search, status, and date range with AND logic", () => {
    // Buscar "cena", confirmados, próximos 7 días: solo plan 1 (el 3 es en 15 días)
    const result = filterPlans(
      plans,
      {
        query: "cena",
        status: "confirmado",
        dateRange: "next7",
      },
      mockNow,
    );
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("returns empty array when no plans match the combined criteria", () => {
    const result = filterPlans(
      plans,
      {
        query: "playa",
        status: "confirmado",
        dateRange: "all",
      },
      mockNow,
    );
    expect(result).toEqual([]);
  });
});

describe("parsePlanFilters", () => {
  it("returns the initial criteria for an empty query string", () => {
    expect(parsePlanFilters(new URLSearchParams(""))).toEqual(INITIAL_PLAN_FILTERS);
  });

  it("reads q, estado and fecha", () => {
    const criteria = parsePlanFilters(new URLSearchParams("q=cena&estado=confirmado&fecha=next7"));
    expect(criteria).toEqual({ query: "cena", status: "confirmado", dateRange: "next7" });
  });

  it("drops unknown estado and fecha values", () => {
    const criteria = parsePlanFilters(new URLSearchParams("estado=borrador&fecha=zzz&q=x"));
    expect(criteria).toEqual({ query: "x", status: "all", dateRange: "all" });
  });

  it("ignores unknown parameters and the 'all' sentinel", () => {
    const criteria = parsePlanFilters(new URLSearchParams("estado=all&fecha=all&foo=bar"));
    expect(criteria).toEqual(INITIAL_PLAN_FILTERS);
  });

  it("caps q at 100 characters", () => {
    const criteria = parsePlanFilters(new URLSearchParams({ q: "a".repeat(150) }));
    expect(criteria.query).toHaveLength(100);
  });
});

describe("serializePlanFilters", () => {
  it("omits default values", () => {
    expect(serializePlanFilters(INITIAL_PLAN_FILTERS).toString()).toBe("");
  });

  it("keeps spaces inside and after the query so typing is not interrupted", () => {
    const params = serializePlanFilters({ ...INITIAL_PLAN_FILTERS, query: "cena de " });
    expect(parsePlanFilters(params).query).toBe("cena de ");
  });

  it("omits a blank query", () => {
    const params = serializePlanFilters({ ...INITIAL_PLAN_FILTERS, query: "   " });
    expect(params.has("q")).toBe(false);
  });

  it("writes only the active filters using canonical keys", () => {
    const params = serializePlanFilters({ query: "cena", status: "pendiente", dateRange: "overdue" });
    expect(params.toString()).toBe("q=cena&estado=pendiente&fecha=overdue");
  });

  it("round-trips through parsePlanFilters", () => {
    const criteria = { query: "100% & más", status: "cancelado", dateRange: "next30" } as const;
    expect(parsePlanFilters(serializePlanFilters(criteria))).toEqual(criteria);
  });
});

describe("toPlanListParams", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("omits defaults and includes today", () => {
    expect(toPlanListParams(INITIAL_PLAN_FILTERS, "2026-06-15")).toEqual({ today: "2026-06-15" });
  });

  it("maps active criteria to API params with a trimmed query", () => {
    const params = toPlanListParams(
      { query: "  cena ", status: "confirmado", dateRange: "today" },
      "2026-06-15",
    );
    expect(params).toEqual({ q: "cena", estado: "confirmado", fecha: "today", today: "2026-06-15" });
  });

  it("uses the local date late in the evening when today is not provided", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 15, 23, 30));
    expect(toPlanListParams(INITIAL_PLAN_FILTERS).today).toBe("2026-06-15");
  });

  it("has a Spanish label for every date filter", () => {
    expect(Object.keys(DATE_FILTER_LABELS).sort()).toEqual(["all", "next30", "next7", "overdue", "today"]);
  });
});
