import { formatBs } from "./expenses.js";

export type LeaveBlockReason = "plan_cerrado" | "deuda_pendiente";

/** A guest can leave only while the plan is still open and they owe nothing. */
export function leaveBlock(planClosed: boolean, balanceCents: number) {
  if (planClosed) {
    return {
      reason: "plan_cerrado" as const,
      message: "El plan ya se cerró, así que ya no puedes retirarte.",
    };
  }
  if (balanceCents < 0) {
    return {
      reason: "deuda_pendiente" as const,
      message: `Tienes una deuda de ${formatBs(-balanceCents)} en este plan. Págala antes de retirarte.`,
    };
  }
  return null;
}
