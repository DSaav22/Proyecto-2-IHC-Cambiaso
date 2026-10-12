import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DateFilter,
  type PlanFilterCriteria,
  type StatusFilter,
  DATE_FILTER_LABELS,
  hasActiveFilters,
} from "../../lib/planFilters";
import { PLAN_STATUS_LABELS } from "../../lib/plans";

interface PlanFiltersBarProps {
  criteria: PlanFilterCriteria;
  onChange: (criteria: PlanFilterCriteria) => void;
  onReset: () => void;
  totalCount: number;
  resultCount: number;
}

const STATUS_OPTION_LABELS: Record<StatusFilter, string> = {
  all: "Todos los estados",
  ...PLAN_STATUS_LABELS,
};

export function PlanFiltersBar({
  criteria,
  onChange,
  onReset,
  totalCount,
  resultCount,
}: PlanFiltersBarProps) {
  const isActive = hasActiveFilters(criteria);

  return (
    <section
      aria-label="Filtros y búsqueda de planes"
      className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search input by title */}
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="plan-search-input"
            type="search"
            placeholder="Buscar planes por título…"
            aria-label="Buscar planes por título"
            value={criteria.query}
            onChange={(e) => onChange({ ...criteria, query: e.target.value })}
            className="pl-10 pr-9"
          />
          {criteria.query ? (
            <button
              type="button"
              onClick={() => onChange({ ...criteria, query: "" })}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Status and Date selects */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="plan-status-filter" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Estado
            </label>
            <select
              id="plan-status-filter"
              value={criteria.status}
              onChange={(e) => onChange({ ...criteria, status: e.target.value as StatusFilter })}
              className="min-h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {(Object.keys(STATUS_OPTION_LABELS) as StatusFilter[]).map((value) => (
                <option key={value} value={value}>
                  {STATUS_OPTION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="plan-date-filter" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Fecha límite
            </label>
            <select
              id="plan-date-filter"
              value={criteria.dateRange}
              onChange={(e) => onChange({ ...criteria, dateRange: e.target.value as DateFilter })}
              className="min-h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((value) => (
                <option key={value} value={value}>
                  {DATE_FILTER_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          {isActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="min-h-11 text-xs"
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {/* Active filter badges / chips */}
      {isActive ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            <Filter aria-hidden="true" className="size-3.5" />
            Filtros activos:
          </span>

          {criteria.query.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-foreground">
              Título: <strong>«{criteria.query.trim()}»</strong>
              <button
                type="button"
                onClick={() => onChange({ ...criteria, query: "" })}
                aria-label="Quitar filtro de título"
                className="ml-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ) : null}

          {criteria.status !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-foreground">
              Estado: <strong>{STATUS_OPTION_LABELS[criteria.status]}</strong>
              <button
                type="button"
                onClick={() => onChange({ ...criteria, status: "all" })}
                aria-label="Quitar filtro de estado"
                className="ml-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ) : null}

          {criteria.dateRange !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-foreground">
              Fecha: <strong>{DATE_FILTER_LABELS[criteria.dateRange]}</strong>
              <button
                type="button"
                onClick={() => onChange({ ...criteria, dateRange: "all" })}
                aria-label="Quitar filtro de fecha"
                className="ml-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
        Mostrando {resultCount} de {totalCount} planes
      </p>
    </section>
  );
}
