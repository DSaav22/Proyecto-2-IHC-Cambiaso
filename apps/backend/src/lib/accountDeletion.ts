import { formatBs } from "./expenses.js";

export type AccountDeletionReason = "planes_abiertos" | "deuda_pendiente";

/** Blocks account deletion when the person still owns open plans or owes money. */
export function accountDeletionBlock(openOwnedCount: number, debtCents: number) {
  if (openOwnedCount > 0) {
    const n = openOwnedCount;
    return {
      reason: "planes_abiertos" as const,
      message:
        n === 1
          ? "Organizás 1 plan abierto. Cancelalo antes de eliminar tu cuenta."
          : `Organizás ${n} planes abiertos. Cancelalos antes de eliminar tu cuenta.`,
    };
  }
  if (debtCents > 0) {
    return {
      reason: "deuda_pendiente" as const,
      message: `Tenés una deuda pendiente de ${formatBs(debtCents)}. Pagala en Gastos antes de eliminar tu cuenta.`,
    };
  }
  return null;
}
