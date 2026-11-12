import type { AnalyticsEventName } from "../api/client";

export interface Funnel {
  flow: string;
  steps: AnalyticsEventName[];
}

/** One funnel per main flow, from the click that starts it to the success. */
export const FUNNELS: Funnel[] = [
  { flow: "Crear plan", steps: ["plan_creacion_iniciada", "plan_creado", "plan_confirmado"] },
  { flow: "Unirse con código", steps: ["union_iniciada", "plan_unido"] },
  {
    flow: "Gastos",
    steps: ["gasto_iniciado", "gasto_registrado", "pago_registrado", "pago_confirmado"],
  },
  { flow: "Retirarse de un plan", steps: ["retiro_iniciado", "plan_abandonado"] },
];

export const ERROR_EVENTS: AnalyticsEventName[] = [
  "union_fallida",
  "gasto_rechazado",
  "retiro_bloqueado",
  "busqueda_sin_resultados",
];

type Counts = Partial<Record<AnalyticsEventName, number>>;

export interface FunnelStep {
  event: AnalyticsEventName;
  count: number;
  /** Percent of the previous step that did not reach this one. Null on the first step. */
  drop: number | null;
}

export function funnelSteps(steps: AnalyticsEventName[], counts: Counts): FunnelStep[] {
  return steps.map((event, index) => {
    const count = counts[event] ?? 0;
    if (index === 0) return { event, count, drop: null };
    const previous = counts[steps[index - 1]] ?? 0;
    const drop = previous > 0 ? Math.max(0, Math.round(((previous - count) / previous) * 100)) : 0;
    return { event, count, drop };
  });
}

export interface Drop {
  flow: string;
  from: AnalyticsEventName;
  to: AnalyticsEventName;
  drop: number;
}

export function biggestDrop(funnels: Funnel[], counts: Counts): Drop | null {
  const drops: Drop[] = funnels.flatMap(({ flow, steps }) =>
    funnelSteps(steps, counts)
      .slice(1)
      .map((step, index) => ({ flow, from: steps[index], to: step.event, drop: step.drop ?? 0 })),
  );
  const worst = drops.reduce<Drop | null>(
    (current, next) => (next.drop > (current?.drop ?? 0) ? next : current),
    null,
  );
  return worst;
}
