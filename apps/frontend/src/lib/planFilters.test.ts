import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATE_FILTER_LABELS,
  hasActiveFilters,
  INITIAL_PLAN_FILTERS,
  parsePlanFilters,
  serializePlanFilters,
  toPlanListParams,
} from "./planFilters";

describe("hasActiveFilters", () => {
  it("is false for the initial criteria", () => {
    expect(hasActiveFilters(INITIAL_PLAN_FILTERS)).toBe(false);
  });

  it("ignores a blank query", () => {
    expect(hasActiveFilters({ ...INITIAL_PLAN_FILTERS, query: "   " })).toBe(false);
  });

  it("is true when any single filter is set", () => {
    expect(hasActiveFilters({ ...INITIAL_PLAN_FILTERS, query: "cena" })).toBe(true);
    expect(hasActiveFilters({ ...INITIAL_PLAN_FILTERS, status: "cancelado" })).toBe(true);
    expect(hasActiveFilters({ ...INITIAL_PLAN_FILTERS, dateRange: "overdue" })).toBe(true);
  });

  it("is true when the filters are combined", () => {
    expect(hasActiveFilters({ query: "cena", status: "confirmado", dateRange: "next7" })).toBe(true);
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

  it("combines query, status and date range into one request", () => {
    const params = toPlanListParams(
      { query: "cena", status: "confirmado", dateRange: "overdue" },
      "2026-10-15",
    );
    expect(params).toEqual({
      q: "cena",
      estado: "confirmado",
      fecha: "overdue",
      today: "2026-10-15",
    });
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
