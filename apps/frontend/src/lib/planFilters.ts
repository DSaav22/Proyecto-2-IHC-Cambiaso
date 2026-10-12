import type { Plan, PlanListParams, PlanStatus } from "../api/client";
import { daysUntil, localToday } from "./plans";

export type StatusFilter = "all" | PlanStatus;
export type DateFilter = "all" | "today" | "next7" | "next30" | "overdue";

export interface PlanFilterCriteria {
  query: string;
  status: StatusFilter;
  dateRange: DateFilter;
}

export const INITIAL_PLAN_FILTERS: PlanFilterCriteria = {
  query: "",
  status: "all",
  dateRange: "all",
};

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "Cualquier fecha",
  today: "Hoy",
  next7: "Próximos 7 días",
  next30: "Próximos 30 días",
  overdue: "Vencidos",
};

const STATUS_VALUES: readonly PlanStatus[] = ["pendiente", "confirmado", "cancelado"];
const DATE_VALUES: readonly DateFilter[] = ["today", "next7", "next30", "overdue"];
const MAX_QUERY_LENGTH = 100;

/** Reads filter criteria from URL params, dropping unknown or invalid values. */
export function parsePlanFilters(params: URLSearchParams): PlanFilterCriteria {
  const estado = params.get("estado");
  const fecha = params.get("fecha");
  return {
    query: (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH),
    status: STATUS_VALUES.find((value) => value === estado) ?? "all",
    dateRange: DATE_VALUES.find((value) => value === fecha) ?? "all",
  };
}

/**
 * Writes only non-default criteria, using the canonical keys q, estado and fecha.
 * The query keeps its spaces so the search input is not altered while typing;
 * `toPlanListParams` trims it before it reaches the API.
 */
export function serializePlanFilters(criteria: PlanFilterCriteria): URLSearchParams {
  const params = new URLSearchParams();
  if (criteria.query.trim()) params.set("q", criteria.query);
  if (criteria.status !== "all") params.set("estado", criteria.status);
  if (criteria.dateRange !== "all") params.set("fecha", criteria.dateRange);
  return params;
}

/** Maps criteria to GET /api/plans params; `today` is the local calendar date. */
export function toPlanListParams(
  criteria: PlanFilterCriteria,
  today: string = localToday(),
): PlanListParams {
  const params: PlanListParams = { today };
  const query = criteria.query.trim();
  if (query) params.q = query;
  if (criteria.status !== "all") params.estado = criteria.status;
  if (criteria.dateRange !== "all") params.fecha = criteria.dateRange;
  return params;
}

export function hasActiveFilters(criteria: PlanFilterCriteria): boolean {
  return (
    criteria.query.trim().length > 0 ||
    criteria.status !== "all" ||
    criteria.dateRange !== "all"
  );
}

/** @deprecated Filtering is server-side now; removed once MyPlansPage stops using it. */
export function filterPlans(
  plans: Plan[],
  criteria: PlanFilterCriteria,
  now: Date = new Date(),
): Plan[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  return plans.filter((plan) => {
    // 1. Text search by title
    if (normalizedQuery && !plan.titulo.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    // 2. Status filter
    if (criteria.status !== "all" && plan.estado !== criteria.status) {
      return false;
    }

    // 3. Due date filter
    if (criteria.dateRange !== "all") {
      const days = daysUntil(plan.dueDate, now);
      switch (criteria.dateRange) {
        case "today":
          if (days !== 0) return false;
          break;
        case "next7":
          if (days < 0 || days > 7) return false;
          break;
        case "next30":
          if (days < 0 || days > 30) return false;
          break;
        case "overdue":
          if (days >= 0) return false;
          break;
      }
    }

    return true;
  });
}
