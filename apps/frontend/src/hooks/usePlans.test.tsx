import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api/client";
import type { Plan, PlansResponse } from "../api/client";
import { INITIAL_PLAN_FILTERS, type PlanFilterCriteria } from "../lib/planFilters";
import { comparePlans } from "../lib/plans";
import { usePlans } from "./usePlans";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      listPlans: vi.fn(),
      createPlan: vi.fn(),
      joinPlan: vi.fn(),
      updatePlan: vi.fn(),
      confirmPlan: vi.fn(),
      cancelPlan: vi.fn(),
      deletePlan: vi.fn(),
      leavePlan: vi.fn(),
    },
  };
});

const plan = (name: string, dueDate: string, createdAt: string): Plan => ({
  id: `3f2a9c1e-0000-4000-8000-${name.padStart(12, "0")}`,
  titulo: `Título ${name}`,
  description: `Descripción ${name}`,
  dueDate,
  estado: "pendiente",
  createdAt,
});

const emptySummary = { total: 0, overdue: 0, nextDueDate: null };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const listPlans = vi.mocked(api.listPlans);
const createPlan = vi.mocked(api.createPlan);
const joinPlanMock = vi.mocked(api.joinPlan);
const updatePlanMock = vi.mocked(api.updatePlan);
const confirmPlanMock = vi.mocked(api.confirmPlan);
const cancelPlanMock = vi.mocked(api.cancelPlan);
const deletePlanMock = vi.mocked(api.deletePlan);
const leavePlanMock = vi.mocked(api.leavePlan);

describe("usePlans", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the list on mount", async () => {
    listPlans.mockResolvedValue({ plans: [plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z")], summary: emptySummary });
    const { result } = renderHook(() => usePlans());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans.map((p) => p.description)).toEqual(["Descripción A"]);
  });

  it("requests the list with local today and an abort signal on mount", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 15, 23, 30));
    listPlans.mockResolvedValue({ plans: [], summary: emptySummary });
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listPlans).toHaveBeenCalledWith({ today: "2026-06-15" }, expect.any(AbortSignal));
  });

  it("exposes the server summary", async () => {
    const summary = { total: 4, overdue: 1, nextDueDate: "2026-06-20" };
    listPlans.mockResolvedValue({ plans: [], summary });
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toEqual(summary);
  });

  it("sends estado and fecha immediately but debounces only q", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0));
    listPlans.mockResolvedValue({ plans: [], summary: emptySummary });
    const { rerender } = renderHook(({ criteria }) => usePlans(criteria), {
      initialProps: { criteria: INITIAL_PLAN_FILTERS as PlanFilterCriteria },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(listPlans).toHaveBeenCalledTimes(1);

    rerender({ criteria: { query: "cena", status: "confirmado", dateRange: "next7" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(listPlans).toHaveBeenCalledTimes(2);
    expect(listPlans.mock.calls[1][0]).toEqual({
      estado: "confirmado",
      fecha: "next7",
      today: "2026-06-15",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(listPlans).toHaveBeenCalledTimes(3);
    expect(listPlans.mock.calls[2][0]).toEqual({
      q: "cena",
      estado: "confirmado",
      fecha: "next7",
      today: "2026-06-15",
    });
  });

  it("collapses five keystrokes into a single request", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    listPlans.mockResolvedValue({ plans: [], summary: emptySummary });
    const { rerender } = renderHook(({ criteria }) => usePlans(criteria), {
      initialProps: { criteria: INITIAL_PLAN_FILTERS as PlanFilterCriteria },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    for (const query of ["c", "ce", "cen", "cena", "cenas"]) {
      rerender({ criteria: { ...INITIAL_PLAN_FILTERS, query } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
    }
    expect(listPlans).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(listPlans).toHaveBeenCalledTimes(2);
    expect(listPlans.mock.calls[1][0]).toMatchObject({ q: "cenas" });
  });

  it("ignores a stale response and aborts the superseded request", async () => {
    const first = deferred<PlansResponse>();
    const second = deferred<PlansResponse>();
    listPlans.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ criteria }) => usePlans(criteria), {
      initialProps: { criteria: INITIAL_PLAN_FILTERS as PlanFilterCriteria },
    });
    rerender({ criteria: { ...INITIAL_PLAN_FILTERS, status: "confirmado" } });
    await waitFor(() => expect(listPlans).toHaveBeenCalledTimes(2));
    expect(listPlans.mock.calls[0][1]?.aborted).toBe(true);

    const fresh = plan("N", "2026-05-01", "2026-01-01T00:00:00.000Z");
    const stale = plan("S", "2026-05-01", "2026-01-01T00:00:00.000Z");
    await act(async () => {
      second.resolve({ plans: [fresh], summary: emptySummary });
    });
    await act(async () => {
      first.resolve({ plans: [stale], summary: emptySummary });
    });
    expect(result.current.plans.map((p) => p.description)).toEqual(["Descripción N"]);
    expect(result.current.loading).toBe(false);
  });

  it("uses loading for the first load and refreshing afterwards", async () => {
    const next = deferred<PlansResponse>();
    listPlans
      .mockResolvedValueOnce({ plans: [], summary: emptySummary })
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ criteria }) => usePlans(criteria), {
      initialProps: { criteria: INITIAL_PLAN_FILTERS as PlanFilterCriteria },
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.refreshing).toBe(false);
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ criteria: { ...INITIAL_PLAN_FILTERS, status: "pendiente" } });
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      next.resolve({ plans: [], summary: emptySummary });
    });
    expect(result.current.refreshing).toBe(false);
  });

  it("keeps the previous plans and summary on failure and retries with reload", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    const summary = { total: 1, overdue: 0, nextDueDate: "2026-05-01" };
    listPlans
      .mockResolvedValueOnce({ plans: [existing], summary })
      .mockRejectedValueOnce(new ApiError(500, "Error en el servidor"))
      .mockResolvedValueOnce({ plans: [existing], summary });
    const { result, rerender } = renderHook(({ criteria }) => usePlans(criteria), {
      initialProps: { criteria: INITIAL_PLAN_FILTERS as PlanFilterCriteria },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ criteria: { ...INITIAL_PLAN_FILTERS, status: "cancelado" } });
    await waitFor(() => expect(result.current.loadError).toBe("Error en el servidor"));
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.summary).toEqual(summary);
    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.loadError).toBeNull();
    expect(listPlans).toHaveBeenCalledTimes(3);
    expect(listPlans.mock.calls[2][0]).toMatchObject({ estado: "cancelado" });
  });

  it("aborts the in-flight request on unmount", async () => {
    listPlans.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => usePlans());
    await waitFor(() => expect(listPlans).toHaveBeenCalledTimes(1));
    const signal = listPlans.mock.calls[0][1];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("inserts a created plan in due-date order and refetches in the background", async () => {
    listPlans.mockResolvedValueOnce({
      plans: [
        plan("A", "2026-03-01", "2026-01-01T00:00:00.000Z"),
        plan("C", "2026-09-01", "2026-01-02T00:00:00.000Z"),
      ],
      summary: emptySummary,
    });
    createPlan.mockResolvedValue({ plan: plan("B", "2026-05-01", "2026-01-03T00:00:00.000Z") });
    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.addPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.addPlan({
        titulo: "t",
        description: "d",
        dueDate: "2026-05-01",
      });
    });
    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans.map((p) => p.description)).toEqual(["Descripción A", "Descripción B", "Descripción C"]);
    expect(listPlans).toHaveBeenCalledTimes(2);
  });

  it("replaces the patched list with the refetched server state", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    const created = plan("B", "2026-06-01", "2026-01-02T00:00:00.000Z");
    const refetched = deferred<PlansResponse>();
    listPlans
      .mockResolvedValueOnce({ plans: [existing], summary: emptySummary })
      .mockReturnValueOnce(refetched.promise);
    createPlan.mockResolvedValue({ plan: created });
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addPlan({ titulo: "t", description: "d", dueDate: "2026-06-01" });
    });
    expect(result.current.plans).toHaveLength(2);
    expect(result.current.refreshing).toBe(true);

    const summary = { total: 2, overdue: 0, nextDueDate: "2026-05-01" };
    await act(async () => {
      refetched.resolve({ plans: [existing, created], summary });
    });
    expect(result.current.summary).toEqual(summary);
    expect(result.current.refreshing).toBe(false);
  });

  it("surfaces field errors and keeps existing data on failure", async () => {
    listPlans.mockResolvedValue({ plans: [plan("A", "2026-03-01", "2026-01-01T00:00:00.000Z")], summary: emptySummary });
    createPlan.mockRejectedValue(new ApiError(400, "Datos inválidos", { dueDate: "Ingresa una fecha válida" }));
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.addPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.addPlan({ titulo: "t", description: "d", dueDate: "2026-03-01" });
    });
    expect(outcome).toEqual({ ok: false, message: "Datos inválidos", fieldErrors: { dueDate: "Ingresa una fecha válida" } });
    expect(result.current.plans).toHaveLength(1);
  });

  it("reports a load error without crashing", async () => {
    listPlans.mockRejectedValue(new ApiError(0, "Sin conexión"));
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBe("Sin conexión");
    expect(result.current.plans).toEqual([]);
  });

  it("marks the plan as confirmado from the server response", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValueOnce({ plans: [existing], summary: emptySummary });
    confirmPlanMock.mockResolvedValue({ plan: { ...existing, estado: "confirmado" } });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.confirmPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.confirmPlan(existing.id);
    });

    expect(confirmPlanMock).toHaveBeenCalledWith(existing.id);
    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans[0].estado).toBe("confirmado");
  });

  it("returns the error message and keeps pendiente when confirming fails", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    confirmPlanMock.mockRejectedValue(new ApiError(409, "El plan ya está confirmado"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.confirmPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.confirmPlan(existing.id);
    });

    expect(outcome).toEqual({ ok: false, message: "El plan ya está confirmado" });
    expect(result.current.plans[0].estado).toBe("pendiente");
  });

  it("updates plan and resort in state on successful updatePlan", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValueOnce({ plans: [existing], summary: emptySummary });
    const updated = { ...existing, titulo: "Título Actualizado", description: "Descripción Actualizada", dueDate: "2026-06-01" };
    updatePlanMock.mockResolvedValue({ plan: updated });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.updatePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.updatePlan(existing.id, {
        titulo: "Título Actualizado",
        description: "Descripción Actualizada",
        dueDate: "2026-06-01",
      });
    });

    expect(updatePlanMock).toHaveBeenCalledWith(existing.id, {
      titulo: "Título Actualizado",
      description: "Descripción Actualizada",
      dueDate: "2026-06-01",
    });
    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans[0].description).toBe("Descripción Actualizada");
  });

  it("returns field errors and leaves plan unchanged when updatePlan fails", async () => {
    const existing = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    updatePlanMock.mockRejectedValue(
      new ApiError(400, "Datos inválidos", { description: "La descripción es obligatoria" }),
    );

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.updatePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.updatePlan(existing.id, {
        titulo: "t",
        description: "",
        dueDate: "2026-05-01",
      });
    });

    expect(outcome).toEqual({
      ok: false,
      message: "Datos inválidos",
      fieldErrors: { description: "La descripción es obligatoria" },
    });
    expect(result.current.plans[0].description).toBe(existing.description);
  });

  it("marks the plan as cancelado when cancelPlan succeeds", async () => {
    const existing: Plan = { ...plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z"), estado: "confirmado" };
    listPlans.mockResolvedValueOnce({ plans: [existing], summary: emptySummary });
    cancelPlanMock.mockResolvedValue({ plan: { ...existing, estado: "cancelado" } });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.cancelPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.cancelPlan(existing.id);
    });

    expect(cancelPlanMock).toHaveBeenCalledWith(existing.id);
    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans[0].estado).toBe("cancelado");
  });

  it("returns error message and retains state when cancelPlan fails", async () => {
    const existing: Plan = { ...plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z"), estado: "pendiente" };
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    cancelPlanMock.mockRejectedValue(new ApiError(409, "Solo un plan confirmado puede ser cancelado"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.cancelPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.cancelPlan(existing.id);
    });

    expect(outcome).toEqual({ ok: false, message: "Solo un plan confirmado puede ser cancelado" });
    expect(result.current.plans[0].estado).toBe("pendiente");
  });

  it("removes plan from state on successful deletion", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    const plan2 = plan("B", "2026-06-01", "2026-01-02T00:00:00.000Z");
    listPlans.mockResolvedValueOnce({ plans: [plan1, plan2], summary: emptySummary });
    deletePlanMock.mockResolvedValue({ message: "Plan eliminado" });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans).toHaveLength(2);

    let outcome: Awaited<ReturnType<typeof result.current.deletePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.deletePlan(plan1.id);
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].id).toBe(plan2.id);
  });

  it("retains plan and returns error message on deletion failure", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValue({ plans: [plan1], summary: emptySummary });
    deletePlanMock.mockRejectedValue(new ApiError(500, "Error en el servidor"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.deletePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.deletePlan(plan1.id);
    });

    expect(outcome).toEqual({ ok: false, message: "Error en el servidor" });
    expect(result.current.plans).toHaveLength(1);
  });

  it("removes the plan from state, calls the API with its id and reloads on leaving", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    const plan2 = plan("B", "2026-06-01", "2026-01-02T00:00:00.000Z");
    listPlans.mockResolvedValueOnce({ plans: [plan1, plan2], summary: emptySummary });
    leavePlanMock.mockResolvedValue({ message: "Has abandonado el plan." });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = listPlans.mock.calls.length;

    let outcome: Awaited<ReturnType<typeof result.current.leavePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.leavePlan(plan1.id);
    });

    expect(outcome).toEqual({ ok: true });
    expect(leavePlanMock).toHaveBeenCalledWith(plan1.id);
    expect(result.current.plans.map((p) => p.id)).toEqual([plan2.id]);
    expect(listPlans.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("retains the plan and returns the API message when leaving fails", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValue({ plans: [plan1], summary: emptySummary });
    leavePlanMock.mockRejectedValue(new ApiError(404, "Plan no encontrado"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.leavePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.leavePlan(plan1.id);
    });

    expect(outcome).toEqual({ ok: false, message: "Plan no encontrado" });
    expect(result.current.plans).toHaveLength(1);
  });

  it("returns a generic message on a network error when leaving", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValue({ plans: [plan1], summary: emptySummary });
    leavePlanMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.leavePlan>> | undefined;
    await act(async () => {
      outcome = await result.current.leavePlan(plan1.id);
    });

    expect(outcome).toEqual({ ok: false, message: "No se pudo abandonar el plan." });
    expect(result.current.plans).toHaveLength(1);
  });

  it("leaves the list untouched when leaving an id that is not listed", async () => {
    const plan1 = plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z");
    listPlans.mockResolvedValueOnce({ plans: [plan1], summary: emptySummary });
    leavePlanMock.mockResolvedValue({ message: "Has abandonado el plan." });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.leavePlan("unknown-id");
    });

    expect(result.current.plans.map((p) => p.id)).toEqual([plan1.id]);
  });

  it("inserts a joined plan in due-date order on success", async () => {
    listPlans.mockResolvedValueOnce({
      plans: [plan("A", "2026-03-01", "2026-01-01T00:00:00.000Z")],
      summary: emptySummary,
    });
    const joined = { ...plan("B", "2026-05-01", "2026-01-02T00:00:00.000Z"), isOwner: false };
    joinPlanMock.mockResolvedValue({ plan: joined });

    listPlans.mockReturnValue(new Promise(() => {})); // background refetch stays pending
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.joinPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.joinPlan("PLZ-TEST01");
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.plans).toHaveLength(2);
    expect(result.current.plans[1].id).toBe(joined.id);
  });

  it("returns error message and retains state when joining fails", async () => {
    listPlans.mockResolvedValue({ plans: [], summary: emptySummary });
    joinPlanMock.mockRejectedValue(new ApiError(404, "Plan no encontrado con este código"));

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: Awaited<ReturnType<typeof result.current.joinPlan>> | undefined;
    await act(async () => {
      outcome = await result.current.joinPlan("PLZ-NOTFOUND");
    });

    expect(outcome).toEqual({
      ok: false,
      message: "Plan no encontrado con este código",
      fieldErrors: {},
    });
    expect(result.current.plans).toHaveLength(0);
  });
});

describe("comparePlans", () => {
  it("orders by due date, then by creation time", () => {
    const list = [
      plan("late", "2026-12-01", "2026-01-01T00:00:00.000Z"),
      plan("tie-2", "2026-03-01", "2026-01-02T00:00:00.000Z"),
      plan("tie-1", "2026-03-01", "2026-01-01T00:00:00.000Z"),
    ];
    expect(list.sort(comparePlans).map((p) => p.description)).toEqual(["Descripción tie-1", "Descripción tie-2", "Descripción late"]);
  });
});
