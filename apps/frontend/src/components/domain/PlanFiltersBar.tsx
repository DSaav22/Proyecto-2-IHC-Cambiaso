import { Filter, Search, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DateFilter,
  type PlanFilterCriteria,
  type StatusFilter,
  DATE_FILTER_LABELS,
  hasActiveFilters,
  INITIAL_PLAN_FILTERS,
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
  const searchRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLSelectElement>(null);

  /** Applies a chip removal and keeps keyboard focus on a stable control. */
  function removeFilter(field: "query" | "status" | "dateRange") {
    const next: PlanFilterCriteria = {
      ...criteria,
      [field]: INITIAL_PLAN_FILTERS[field],
    };
    onChange(next);
    if (!hasActiveFilters(next) || field === "query") searchRef.current?.focus();
    else (field === "status" ? statusRef : dateRef).current?.focus();
  }

  function resetFilters() {
    onReset();
    searchRef.current?.focus();
  }

  return (
    <section
      aria-label="Filtros y búsqueda de planes"
      className="grid min-w-0 gap-3 rounded-xl border bg-card p-4 shadow-xs"
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
        {/* Search input by title */}
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            id="plan-search-input"
            type="search"
            placeholder="Buscar planes por título…"
            aria-label="Buscar planes por título"
            value={criteria.query}
            onChange={(e) => onChange({ ...criteria, query: e.target.value })}
            className="pl-10 pr-11"
          />
          {criteria.query ? (
            <button
              type="button"
              onClick={() => onChange({ ...criteria, query: "" })}
              aria-label="Limpiar búsqueda"
              className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Status and Date selects */}
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:flex lg:items-center">
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor="plan-status-filter" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Estado
            </label>
            <select
              ref={statusRef}
              id="plan-status-filter"
              value={criteria.status}
              onChange={(e) => onChange({ ...criteria, status: e.target.value as StatusFilter })}
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {(Object.keys(STATUS_OPTION_LABELS) as StatusFilter[]).map((value) => (
                <option key={value} value={value}>
                  {STATUS_OPTION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid min-w-0 gap-1.5">
            <label htmlFor="plan-date-filter" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Fecha límite
            </label>
            <select
              ref={dateRef}
              id="plan-date-filter"
              value={criteria.dateRange}
              onChange={(e) => onChange({ ...criteria, dateRange: e.target.value as DateFilter })}
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
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
              onClick={resetFilters}
              className="min-h-11 sm:col-span-2 lg:col-span-1"
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {/* Active filter badges / chips */}
      {isActive ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-sm">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            <Filter aria-hidden="true" className="size-3.5" />
            Filtros activos:
          </span>

          {criteria.query.trim() ? (
            <span className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md bg-muted pl-2.5 text-foreground">
              Título: <strong className="min-w-0 break-words">«{criteria.query.trim()}»</strong>
              <button
                type="button"
                onClick={() => removeFilter("query")}
                aria-label="Quitar filtro de título"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ) : null}

          {criteria.status !== "all" ? (
            <span className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md bg-muted pl-2.5 text-foreground">
              Estado: <strong>{STATUS_OPTION_LABELS[criteria.status]}</strong>
              <button
                type="button"
                onClick={() => removeFilter("status")}
                aria-label="Quitar filtro de estado"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ) : null}

          {criteria.dateRange !== "all" ? (
            <span className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md bg-muted pl-2.5 text-foreground">
              Fecha: <strong>{DATE_FILTER_LABELS[criteria.dateRange]}</strong>
              <button
                type="button"
                onClick={() => removeFilter("dateRange")}
                aria-label="Quitar filtro de fecha"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
