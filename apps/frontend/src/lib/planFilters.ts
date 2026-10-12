import type { Plan, PlanStatus } from "../api/client";
import { daysUntil } from "./plans";

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

export function hasActiveFilters(criteria: PlanFilterCriteria): boolean {
  return (
    criteria.query.trim().length > 0 ||
    criteria.status !== "all" ||
    criteria.dateRange !== "all"
  );
}

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
