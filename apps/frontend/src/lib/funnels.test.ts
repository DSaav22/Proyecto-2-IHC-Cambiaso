import { describe, expect, it } from "vitest";
import { biggestDrop, funnelSteps, type Funnel } from "./funnels";

describe("funnelSteps", () => {
  it("calcula cuánto se pierde entre un paso y el siguiente", () => {
    const steps = funnelSteps(["union_iniciada", "plan_unido"], { union_iniciada: 10, plan_unido: 6 });

    expect(steps).toEqual([
      { event: "union_iniciada", count: 10, drop: null },
      { event: "plan_unido", count: 6, drop: 40 },
    ]);
  });

  it("no divide por cero cuando nadie empezó el flujo", () => {
    const steps = funnelSteps(["retiro_iniciado", "plan_abandonado"], {});

    expect(steps[1]).toEqual({ event: "plan_abandonado", count: 0, drop: 0 });
  });

  it("no muestra caídas negativas si un paso tiene más eventos que el anterior", () => {
    const steps = funnelSteps(["plan_creado", "plan_confirmado"], { plan_creado: 2, plan_confirmado: 3 });

    expect(steps[1].drop).toBe(0);
  });
});

describe("biggestDrop", () => {
  const funnels: Funnel[] = [
    { flow: "Unirse con código", steps: ["union_iniciada", "plan_unido"] },
    { flow: "Gastos", steps: ["gasto_iniciado", "gasto_registrado", "pago_registrado"] },
  ];

  it("encuentra el paso donde más gente se pierde entre todos los flujos", () => {
    const counts = { union_iniciada: 10, plan_unido: 8, gasto_iniciado: 10, gasto_registrado: 4, pago_registrado: 3 };

    expect(biggestDrop(funnels, counts)).toEqual({
      flow: "Gastos",
      from: "gasto_iniciado",
      to: "gasto_registrado",
      drop: 60,
    });
  });

  it("devuelve null si todavía no hay caídas", () => {
    expect(biggestDrop(funnels, {})).toBeNull();
  });
});
