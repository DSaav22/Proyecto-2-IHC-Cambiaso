import { describe, expect, it } from "vitest";
import type { Plan } from "../api/client";
import { filterPlans, hasActiveFilters, INITIAL_PLAN_FILTERS } from "./planFilters";

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
