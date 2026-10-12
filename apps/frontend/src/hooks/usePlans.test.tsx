import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api/client";
import type { Plan } from "../api/client";
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
const listPlans = vi.mocked(api.listPlans);
const createPlan = vi.mocked(api.createPlan);
const joinPlanMock = vi.mocked(api.joinPlan);
const updatePlanMock = vi.mocked(api.updatePlan);
const confirmPlanMock = vi.mocked(api.confirmPlan);
const cancelPlanMock = vi.mocked(api.cancelPlan);
const deletePlanMock = vi.mocked(api.deletePlan);

describe("usePlans", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the list on mount", async () => {
    listPlans.mockResolvedValue({ plans: [plan("A", "2026-05-01", "2026-01-01T00:00:00.000Z")], summary: emptySummary });
    const { result } = renderHook(() => usePlans());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans.map((p) => p.description)).toEqual(["Descripción A"]);
  });

  it("inserts a created plan in due-date order without refetching", async () => {
    listPlans.mockResolvedValue({
      plans: [
        plan("A", "2026-03-01", "2026-01-01T00:00:00.000Z"),
        plan("C", "2026-09-01", "2026-01-02T00:00:00.000Z"),
      ],
      summary: emptySummary,
    });
    createPlan.mockResolvedValue({ plan: plan("B", "2026-05-01", "2026-01-03T00:00:00.000Z") });
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
    expect(listPlans).toHaveBeenCalledTimes(1);
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
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    confirmPlanMock.mockResolvedValue({ plan: { ...existing, estado: "confirmado" } });

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
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    const updated = { ...existing, titulo: "Título Actualizado", description: "Descripción Actualizada", dueDate: "2026-06-01" };
    updatePlanMock.mockResolvedValue({ plan: updated });

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
    listPlans.mockResolvedValue({ plans: [existing], summary: emptySummary });
    cancelPlanMock.mockResolvedValue({ plan: { ...existing, estado: "cancelado" } });

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
    listPlans.mockResolvedValue({ plans: [plan1, plan2], summary: emptySummary });
    deletePlanMock.mockResolvedValue({ message: "Plan eliminado" });

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

  it("inserts a joined plan in due-date order on success", async () => {
    listPlans.mockResolvedValue({
      plans: [plan("A", "2026-03-01", "2026-01-01T00:00:00.000Z")],
      summary: emptySummary,
    });
    const joined = { ...plan("B", "2026-05-01", "2026-01-02T00:00:00.000Z"), isOwner: false };
    joinPlanMock.mockResolvedValue({ plan: joined });

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
