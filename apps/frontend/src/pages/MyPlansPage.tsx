import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { CalendarClock, ListChecks, Plus, RotateCw, TriangleAlert, Users } from "lucide-react";
import type { Plan, PlanInput } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ErrorAlert,
  JoinPlanDialog,
  PlanDialog,
  PlanFiltersBar,
  PlanList,
  PlanSectionTabs,
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
import {
  countPlansBySection,
  filterPlansBySection,
  parsePlanSection,
  PLAN_SECTION_EMPTY_TEXT,
  withPlanSection,
} from "../lib/planSections";
import { PlanCoordinationDialog } from "../components/domain/PlanCoordinationDialog";

export default function MyPlansPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawParams = searchParams.toString();
  const criteria = useMemo(() => parsePlanFilters(new URLSearchParams(rawParams)), [rawParams]);
  const section = parsePlanSection(new URLSearchParams(rawParams));
  const canonicalParams = withPlanSection(serializePlanFilters(criteria), section).toString();
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
    leavePlan,
  } = usePlans(criteria);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newPlanForCoordination, setNewPlanForCoordination] = useState<Plan | null>(null);
  const [coordinationPlan, setCoordinationPlan] = useState<Plan | null>(null);

  // Scroll to targeted plan when navigating via hash (e.g. from activity history)
  useEffect(() => {
    if (loading || !location.hash) return;
    const targetId = location.hash.replace(/^#/, "");
    const timer = setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView?.({ behavior: "smooth", block: "center" });
        element.focus?.({ preventScroll: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, location.hash, plans]);

  // Rewrite a corrupted or non-canonical URL once so it always mirrors the criteria in use.
  useEffect(() => {
    if (canonicalParams !== rawParams) {
      setSearchParams(new URLSearchParams(canonicalParams), { replace: true });
    }
  }, [canonicalParams, rawParams, setSearchParams]);

  // Typing replaces the history entry; discrete changes (selects, chips, reset) push one.
  function setCriteria(next: PlanFilterCriteria) {
    setSearchParams(withPlanSection(serializePlanFilters(next), section), {
      replace: next.query !== criteria.query,
    });
  }

  const sectionCounts = countPlansBySection(plans);
  const visiblePlans = filterPlansBySection(plans, section);
  const sectionIsEmpty = section !== "todos" && plans.length > 0 && visiblePlans.length === 0;

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
    if (result.ok && result.plan) {
      setDialogOpen(false);
      setNotice("Plan creado correctamente.");
      setNewPlanForCoordination(result.plan);
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

  async function handleLeave(id: string) {
    setNotice(null);
    setActionError(null);
    const result = await leavePlan(id);
    if (result.ok) setNotice("Has abandonado el plan.");
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
            disabled={refreshing || loading}
            aria-label="Actualizar planes"
            title="Actualizar planes"
            onClick={() => void reload()}
          >
            <RotateCw aria-hidden="true" className={refreshing ? "animate-spin" : undefined} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
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
        <div className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)] sm:max-w-md shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <SuccessNotice onClose={() => setNotice(null)}>{notice}</SuccessNotice>
        </div>
      ) : null}
      {newPlanForCoordination ? (
        <div className="rounded-lg border border-secondary bg-secondary/60 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              <span className="font-semibold">Plan creado correctamente.</span>{" "}
              Ahora puedes agregar fechas y lugares para que el grupo vote.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setCoordinationPlan(newPlanForCoordination)}
            >
              Agregar opciones
            </Button>
          </div>
        </div>
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

              <PlanSectionTabs
                section={section}
                counts={sectionCounts}
                searchFor={(next) => withPlanSection(serializePlanFilters(criteria), next).toString()}
              />

              <PlanFiltersBar
                criteria={criteria}
                onChange={setCriteria}
                onReset={() => setCriteria(INITIAL_PLAN_FILTERS)}
                totalCount={summary.total}
                resultCount={visiblePlans.length}
              />
            </>
          ) : null}

          <section aria-label="Tus planes" aria-busy={refreshing}>
            {loadError && summary.total === 0 && plans.length === 0 ? null : sectionIsEmpty ? (
              <p className="rounded-xl border border-dashed bg-card/70 px-6 py-10 text-center text-sm text-muted-foreground">
                {PLAN_SECTION_EMPTY_TEXT[section]}
              </p>
            ) : (
              <PlanList
                plans={visiblePlans}
                emptyState={summary.total > 0 ? "no-match" : "no-plans"}
                onClearFilters={() => setCriteria(INITIAL_PLAN_FILTERS)}
                onEdit={handleEdit}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onLeave={handleLeave}
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
      <PlanCoordinationDialog
        planId={coordinationPlan?.id ?? ""}
        planTitle={coordinationPlan?.titulo ?? ""}
        isOwner
        open={coordinationPlan !== null}
        onOpenChange={(open) => {
          if (!open) setCoordinationPlan(null);
        }}
      />

      <JoinPlanDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onJoin={handleJoin}
      />
    </div>
  );
}
