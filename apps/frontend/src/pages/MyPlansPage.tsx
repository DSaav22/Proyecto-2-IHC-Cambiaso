import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, FilterX, ListChecks, Plus, TriangleAlert, Users } from "lucide-react";
import type { Plan, PlanInput } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ErrorAlert,
  JoinPlanDialog,
  PlanDialog,
  PlanFiltersBar,
  PlanList,
  StatCard,
  SuccessNotice,
} from "../components/domain";

import { usePlans } from "../hooks/usePlans";
import {
  INITIAL_PLAN_FILTERS,
  parsePlanFilters,
  serializePlanFilters,
  type PlanFilterCriteria,
} from "../lib/planFilters";
import { getDueStatus } from "../lib/plans";

export default function MyPlansPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawParams = searchParams.toString();
  const criteria = useMemo(() => parsePlanFilters(new URLSearchParams(rawParams)), [rawParams]);
  const canonicalParams = serializePlanFilters(criteria).toString();
  const {
    plans,
    summary,
    loading,
    refreshing,
    loadError,
    reload,
    addPlan,
    joinPlan,
    updatePlan,
    confirmPlan,
    cancelPlan,
    deletePlan,
  } = usePlans(criteria);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rewrite a corrupted or non-canonical URL once so it always mirrors the criteria in use.
  useEffect(() => {
    if (canonicalParams !== rawParams) {
      setSearchParams(new URLSearchParams(canonicalParams), { replace: true });
    }
  }, [canonicalParams, rawParams, setSearchParams]);

  // Typing replaces the history entry; discrete changes (selects, chips, reset) push one.
  function setCriteria(next: PlanFilterCriteria) {
    setSearchParams(serializePlanFilters(next), { replace: next.query !== criteria.query });
  }

  async function handleSubmit(input: PlanInput) {
    setActionError(null);
    if (editingPlan) {
      const result = await updatePlan(editingPlan.id, input);
      if (result.ok) {
        setDialogOpen(false);
        setEditingPlan(null);
        setNotice("Plan actualizado correctamente.");
      }
      return result;
    }
    const result = await addPlan(input);
    if (result.ok) {
      setDialogOpen(false);
      setNotice("Plan creado correctamente.");
    }
    return result;
  }

  async function handleJoin(code: string) {
    setActionError(null);
    const result = await joinPlan(code);
    if (result.ok) {
      setNotice("Te has unido al plan correctamente.");
    }
    return result;
  }

  function openCreateDialog() {
    setEditingPlan(null);
    setNotice(null);
    setActionError(null);
    setDialogOpen(true);
  }

  function handleEdit(plan: Plan) {
    setEditingPlan(plan);
    setNotice(null);
    setActionError(null);
    setDialogOpen(true);
  }

  async function handleConfirm(id: string) {
    setNotice(null);
    setActionError(null);
    const result = await confirmPlan(id);
    if (result.ok) setNotice("Plan confirmado correctamente.");
    else setActionError(result.message);
    return result;
  }

  async function handleCancel(id: string) {
    setNotice(null);
    setActionError(null);
    const result = await cancelPlan(id);
    if (result.ok) setNotice("Plan cancelado correctamente.");
    else setActionError(result.message);
    return result;
  }

  async function handleDelete(id: string) {
    setNotice(null);
    setActionError(null);
    const result = await deletePlan(id);
    if (result.ok) setNotice("Plan eliminado correctamente.");
    else setActionError(result.message);
    return result;
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Hola, {user?.name}</h1>
          <p className="text-muted-foreground">
            Organiza y da seguimiento a los planes de tu grupo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setNotice(null);
              setActionError(null);
              setJoinDialogOpen(true);
            }}
          >
            <Users aria-hidden="true" />
            Unirse con código
          </Button>
          <Button type="button" size="lg" onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            Nuevo plan
          </Button>
        </div>
      </header>

      {notice ? (
        <SuccessNotice onClose={() => setNotice(null)}>{notice}</SuccessNotice>
      ) : null}
      <ErrorAlert message={loadError || actionError} />
      {loadError ? (
        <div>
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p role="status" className="text-muted-foreground">
          Cargando tus planes…
        </p>
      ) : (
        <>
          {summary.total > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={ListChecks} label="Planes" value={String(summary.total)} />
                <StatCard
                  icon={CalendarClock}
                  label="Próximo plan"
                  tone="accent"
                  value={
                    summary.nextDueDate ? getDueStatus(summary.nextDueDate).label : "Sin pendientes"
                  }
                />
                <StatCard
                  icon={TriangleAlert}
                  label="Vencidos"
                  tone="danger"
                  value={String(summary.overdue)}
                />
              </div>

              <PlanFiltersBar
                criteria={criteria}
                onChange={setCriteria}
                onReset={() => setCriteria(INITIAL_PLAN_FILTERS)}
                totalCount={summary.total}
                filteredCount={plans.length}
              />
            </>
          ) : null}

          <section aria-label="Tus planes" aria-busy={refreshing}>
            {summary.total > 0 && plans.length === 0 ? (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FilterX aria-hidden="true" className="size-6" />
                </div>
                <div className="max-w-md space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    No existen planes con estas características
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Prueba a ajustar o quitar los filtros aplicados para volver a ver tus planes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCriteria(INITIAL_PLAN_FILTERS)}
                >
                  Restablecer filtros
                </Button>
              </div>
            ) : loadError && summary.total === 0 && plans.length === 0 ? null : (
              <PlanList
                plans={plans}
                onEdit={handleEdit}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            )}
          </section>
        </>
      )}

      <PlanDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPlan(null);
        }}
        initialData={editingPlan}
        onSubmit={handleSubmit}
      />

      <JoinPlanDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onJoin={handleJoin}
      />
    </div>
  );
}
