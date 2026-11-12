import { describe, expect, it } from "vitest";
import { leaveBlock } from "./leavePlan";

describe("leaveBlock", () => {
  it("deja retirarse si el plan sigue abierto y no debe nada", () => {
    expect(leaveBlock(false, 0)).toBeNull();
  });

  it("deja retirarse si le deben plata", () => {
    expect(leaveBlock(false, 4500)).toBeNull();
  });

  it("bloquea con deuda pendiente y dice cuánto debe", () => {
    expect(leaveBlock(false, -4500)).toEqual({
      reason: "deuda_pendiente",
      message: "Tienes una deuda de Bs 45,00 en este plan. Págala antes de retirarte.",
    });
  });

  it("bloquea si el plan ya se cerró", () => {
    expect(leaveBlock(true, 0)?.reason).toBe("plan_cerrado");
  });
});
