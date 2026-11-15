import { describe, expect, it } from "vitest";
import { accountDeletionBlock } from "./accountDeletion";

describe("accountDeletionBlock", () => {
  it("allows deletion when there are no open plans and no debt", () => {
    expect(accountDeletionBlock(0, 0)).toBeNull();
  });

  it("blocks when the person still owns open plans and says what to do", () => {
    expect(accountDeletionBlock(1, 0)).toEqual({
      reason: "planes_abiertos",
      message: "Organizás 1 plan abierto. Cancelalo antes de eliminar tu cuenta.",
    });
    expect(accountDeletionBlock(3, 0)?.reason).toBe("planes_abiertos");
    expect(accountDeletionBlock(3, 0)?.message).toContain("3 planes abiertos");
  });

  it("blocks when there is pending debt and says to pay it in Gastos", () => {
    expect(accountDeletionBlock(0, 4500)).toEqual({
      reason: "deuda_pendiente",
      message: "Tenés una deuda pendiente de Bs 45,00. Pagala en Gastos antes de eliminar tu cuenta.",
    });
  });

  it("checks open plans before debt so the first blocker is clear", () => {
    expect(accountDeletionBlock(2, 9000)?.reason).toBe("planes_abiertos");
  });
});
