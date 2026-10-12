import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../api/client";
import type { Plan, PlanInput, PlanListParams, PlanSummary } from "../api/client";
import { INITIAL_PLAN_FILTERS, serializePlanFilters, toPlanListParams, type PlanFilterCriteria } from "../lib/planFilters";
import { comparePlans, localToday } from "../lib/plans";
import { useDebouncedValue } from "./useDebouncedValue";

export type AddPlanResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type JoinPlanResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type UpdatePlanResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type ConfirmPlanResult =
  | { ok: true }
  | { ok: false; message: string };

export type CancelPlanResult =
  | { ok: true }
  | { ok: false; message: string };

export type DeletePlanResult =
  | { ok: true }
  | { ok: false; message: string };

const EMPTY_SUMMARY: PlanSummary = { total: 0, overdue: 0, nextDueDate: null };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Loads the plan list from the server for the given criteria and exposes
 * mutations. Only `query` is debounced; state and date filters apply at once.
 */
export function usePlans(criteria: PlanFilterCriteria = INITIAL_PLAN_FILTERS) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<PlanSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(criteria.query);
  const effective: PlanFilterCriteria = { ...criteria, query: debouncedQuery };
  const requestKey = serializePlanFilters(effective).toString();

  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const fetchPlans = useCallback(async (): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    const params: PlanListParams = toPlanListParams(effectiveRef.current, localToday());

    if (hasLoadedRef.current) setRefreshing(true);
    try {
      const data = await api.listPlans(params, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setPlans([...data.plans].sort(comparePlans));
      setSummary(data.summary);
      setLoadError(null);
    } catch (error) {
      if (requestId !== requestIdRef.current || isAbortError(error)) return;
      setLoadError(error instanceof ApiError ? error.message : "No se pudieron cargar tus planes.");
    }
    hasLoadedRef.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [requestKey, fetchPlans]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    },
    [],
  );

  const reload = fetchPlans;

  const addPlan = useCallback(async (input: PlanInput): Promise<AddPlanResult> => {
    try {
      const { plan } = await api.createPlan(input);
      setPlans((current) => [...current, plan].sort(comparePlans));
      void reload();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
      }
      return { ok: false, message: "No se pudo crear el plan.", fieldErrors: {} };
    }
  }, [reload]);

  const joinPlan = useCallback(async (code: string): Promise<JoinPlanResult> => {
    try {
      const { plan } = await api.joinPlan(code);
      setPlans((current) => [...current, plan].sort(comparePlans));
      void reload();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
      }
      return { ok: false, message: "No se pudo unir al plan.", fieldErrors: {} };
    }
  }, [reload]);

  const updatePlan = useCallback(
    async (id: string, input: PlanInput): Promise<UpdatePlanResult> => {
      try {
        const { plan } = await api.updatePlan(id, input);
        setPlans((current) => current.map((p) => (p.id === id ? plan : p)).sort(comparePlans));
        void reload();
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
        }
        return { ok: false, message: "No se pudo actualizar el plan.", fieldErrors: {} };
      }
    },
    [reload],
  );

  const confirmPlan = useCallback(async (id: string): Promise<ConfirmPlanResult> => {
    try {
      const { plan } = await api.confirmPlan(id);
      setPlans((current) => current.map((p) => (p.id === id ? { ...p, estado: plan.estado } : p)));
      void reload();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: "No se pudo confirmar el plan." };
    }
  }, [reload]);

  const cancelPlan = useCallback(async (id: string): Promise<CancelPlanResult> => {
    try {
      const { plan } = await api.cancelPlan(id);
      setPlans((current) => current.map((p) => (p.id === id ? { ...p, estado: plan.estado } : p)));
      void reload();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: "No se pudo cancelar el plan." };
    }
  }, [reload]);

  const deletePlan = useCallback(
    async (id: string): Promise<DeletePlanResult> => {
      try {
        await api.deletePlan(id);
        setPlans((current) => current.filter((p) => p.id !== id));
        void reload();
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          return { ok: false, message: error.message };
        }
        return { ok: false, message: "No se pudo eliminar el plan." };
      }
    },
    [reload],
  );

  return {
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
  };
}
