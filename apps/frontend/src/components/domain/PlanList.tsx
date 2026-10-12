import { CalendarPlus, Plus } from "lucide-react";
import type { Plan } from "../../api/client";
import { Button } from "@/components/ui/button";
import { PlanCard, type PlanActionResult } from "./PlanCard";

interface PlanListProps {
  plans: Plan[];
  onCreate?: () => void;
  onEdit?: (plan: Plan) => void;
  onConfirm?: (id: string) => Promise<PlanActionResult>;
  onCancel?: (id: string) => Promise<PlanActionResult>;
  onDelete?: (id: string) => Promise<PlanActionResult>;
}

export function PlanList({
  plans,
  onCreate,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
}: PlanListProps) {
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
          />
        </li>
      ))}
    </ul>
  );
}
