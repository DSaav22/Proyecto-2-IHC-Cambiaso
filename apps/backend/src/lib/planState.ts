/** Pure plan state machine: no Prisma or Express imports. */
export const PLAN_STATES = ["borrador", "confirmado", "cancelado"] as const;
export type PlanState = (typeof PLAN_STATES)[number];

export const INITIAL_PLAN_STATE: PlanState = "borrador";

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: PlanState,
    public readonly to: PlanState,
  ) {
    super(`Invalid plan transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class DeleteBlockedError extends Error {
  constructor(
    public readonly state: PlanState,
    message = "No se puede eliminar un plan confirmado; primero debe cancelarse.",
  ) {
    super(message);
    this.name = "DeleteBlockedError";
  }
}

export class EditBlockedError extends Error {
  constructor(
    public readonly state: PlanState,
    message = "No se puede editar un plan cancelado.",
  ) {
    super(message);
    this.name = "EditBlockedError";
  }
}

/** Returns a new plan in `confirmado`; only a `borrador` plan can be confirmed. */
export function confirmPlan<T extends { estado: string }>(
  plan: T,
): Omit<T, "estado"> & { estado: "confirmado" } {
  if (plan.estado !== "borrador") {
    throw new InvalidTransitionError(plan.estado as PlanState, "confirmado");
  }
  return { ...plan, estado: "confirmado" };
}

/** Returns a new plan in `cancelado`; only a `borrador` or `confirmado` plan can be cancelled. */
export function cancelPlan<T extends { estado: string }>(
  plan: T,
): Omit<T, "estado"> & { estado: "cancelado" } {
  if (plan.estado !== "confirmado" && plan.estado !== "borrador") {
    throw new InvalidTransitionError(plan.estado as PlanState, "cancelado");
  }
  return { ...plan, estado: "cancelado" };
}

/** Returns false when estado === 'confirmado', true otherwise. */
export function canDelete(plan: { estado: string }): boolean {
  return plan.estado !== "confirmado";
}

/** Returns false when estado === 'cancelado', true otherwise. */
export function canEdit(plan: { estado: string }): boolean {
  return plan.estado !== "cancelado";
}
