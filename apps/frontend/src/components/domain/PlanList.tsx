import { CalendarPlus, FilterX, Plus } from "lucide-react";
import type { Plan } from "../../api/client";
import { Button } from "@/components/ui/button";
import { PlanCard, type PlanActionResult } from "./PlanCard";

interface PlanListProps {
  plans: Plan[];
  /** Which empty state to show; "no-match" means the user has plans but the filters hide them. */
  emptyState?: "no-plans" | "no-match";
  onClearFilters?: () => void;
  onCreate?: () => void;
  onEdit?: (plan: Plan) => void;
  onConfirm?: (id: string) => Promise<PlanActionResult>;
  onCancel?: (id: string) => Promise<PlanActionResult>;
  onDelete?: (id: string) => Promise<PlanActionResult>;
  onLeave?: (id: string) => Promise<PlanActionResult>;
}

export function PlanList({
  plans,
  emptyState = "no-plans",
  onClearFilters,
  onCreate,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
  onLeave,
}: PlanListProps) {
  if (plans.length === 0 && emptyState === "no-match") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FilterX aria-hidden="true" className="size-6" />
        </div>
        <div className="max-w-md space-y-1">
          <p className="text-base font-semibold text-foreground">
            No hay planes que coincidan con los filtros
          </p>
          <p className="text-sm text-muted-foreground">
            Prueba a ajustar o quitar los filtros aplicados para volver a ver tus planes.
          </p>
        </div>
        {onClearFilters ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-input bg-card/70 px-6 py-14 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <CalendarPlus aria-hidden="true" className="size-8" />
        </span>
        <div className="grid gap-1">
          <h2 className="text-xl font-bold">Todavía no tienes planes</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crea el primero y empieza a organizar a tu grupo con una fecha clara.
          </p>
        </div>
        {onCreate ? (
          <Button type="button" onClick={onCreate}>
            <Plus aria-hidden="true" />
            Crear mi primer plan
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <li key={plan.id}>
          <PlanCard
            plan={plan}
            onEdit={onEdit}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onDelete={onDelete}
            onLeave={onLeave}
          />
        </li>
      ))}
    </ul>
  );
}
