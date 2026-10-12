import { describe, expect, it } from "vitest";
import {
  INITIAL_PLAN_STATE,
  InvalidTransitionError,
  PLAN_STATES,
  cancelPlan,
  canDelete,
  canEdit,
  confirmPlan,
  DeleteBlockedError,
  EditBlockedError,
} from "./planState.js";

const draft = {
  id: "p1",
  description: "Cena de grupo",
  dueDate: new Date("2026-12-24T00:00:00.000Z"),
  userId: "u1",
  estado: INITIAL_PLAN_STATE,
};

describe("plan state machine", () => {
  it("starts every plan as borrador", () => {
    expect(INITIAL_PLAN_STATE).toBe("borrador");
    expect(PLAN_STATES).toEqual(["borrador", "confirmado", "cancelado"]);
  });

  it("moves a borrador plan to confirmado", () => {
    expect(confirmPlan(draft).estado).toBe("confirmado");
  });

  it("rejects confirming a plan that is already confirmado", () => {
    const confirmed = confirmPlan(draft);
    expect(() => confirmPlan(confirmed)).toThrow(InvalidTransitionError);
  });

  it("preserves description, dueDate and userId when confirming", () => {
    const confirmed = confirmPlan(draft);
    expect(confirmed).toMatchObject({
      id: draft.id,
      description: draft.description,
      dueDate: draft.dueDate,
      userId: draft.userId,
    });
    expect(draft.estado).toBe("borrador");
  });

  it("cancels a confirmed plan", () => {
    const confirmed = confirmPlan(draft);
    const cancelled = cancelPlan(confirmed);
    expect(cancelled.estado).toBe("cancelado");
  });

  it("cancels a borrador plan", () => {
    const cancelled = cancelPlan(draft);
    expect(cancelled.estado).toBe("cancelado");
  });

  it("rejects cancelling an already cancelado plan", () => {
    const confirmed = confirmPlan(draft);
    const cancelled = cancelPlan(confirmed);
    expect(() => cancelPlan(cancelled)).toThrow(InvalidTransitionError);
  });

  it("preserves plan data when cancelling", () => {
    const confirmed = confirmPlan(draft);
    const cancelled = cancelPlan(confirmed);
    expect(cancelled).toMatchObject({
      id: draft.id,
      description: draft.description,
      dueDate: draft.dueDate,
      userId: draft.userId,
    });
  });

  it("evaluates canDelete correctly across states", () => {
    const confirmed = confirmPlan(draft);
    const cancelled = cancelPlan(confirmed);

    expect(canDelete(draft)).toBe(true);
    expect(canDelete(confirmed)).toBe(false);
    expect(canDelete(cancelled)).toBe(true);
  });

  it("DeleteBlockedError instantiates with state and helpful message", () => {
    const err = new DeleteBlockedError("confirmado");
    expect(err.name).toBe("DeleteBlockedError");
    expect(err.state).toBe("confirmado");
    expect(err.message).toContain("cancelarse");
  });

  it("evaluates canEdit correctly across states", () => {
    const confirmed = confirmPlan(draft);
    const cancelled = cancelPlan(confirmed);

    expect(canEdit(draft)).toBe(true);
    expect(canEdit(confirmed)).toBe(true);
    expect(canEdit(cancelled)).toBe(false);
  });

  it("EditBlockedError instantiates with state and helpful message", () => {
    const err = new EditBlockedError("cancelado");
    expect(err.name).toBe("EditBlockedError");
    expect(err.state).toBe("cancelado");
    expect(err.message).toContain("cancelado");
  });
});

