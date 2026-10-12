export type DemoPlanState = "pendiente" | "confirmado" | "cancelado";

export type DemoPlanOwner = "usuario1" | "usuario2";

export interface DemoPlanDefinition {
  shareCode: string;
  owner: DemoPlanOwner;
  titulo: string;
  description: string;
  estado: DemoPlanState;
  /** Due date relative to the seed run date, in days (negative = overdue). */
  offsetDays: number;
  /** Seeded user that joins the plan as a guest, if any. */
  guest?: DemoPlanOwner;
}

export interface DemoPlan extends DemoPlanDefinition {
  dueDate: Date;
}

/**
 * Stable demo plans for evaluators. Each share code is the per-plan identifier that keeps the
 * seed idempotent (create-only upserts keyed by `shareCode`).
 */
export const DEMO_PLAN_DEFINITIONS: readonly DemoPlanDefinition[] = [
  {
    shareCode: "PLZ-SEED2A",
    owner: "usuario1",
    titulo: "Cena de cumpleaños",
    description: "Reservar mesa para el grupo en el restaurante del centro.",
    estado: "pendiente",
    offsetDays: 3,
  },
  {
    shareCode: "PLZ-SEED2B",
    owner: "usuario1",
    titulo: "Excursión al volcán",
    description: "Salida de día completo con transporte compartido.",
    estado: "confirmado",
    offsetDays: 10,
  },
  {
    shareCode: "PLZ-SEED2C",
    owner: "usuario1",
    titulo: "Almuerzo de equipo",
    description: "Almuerzo para celebrar la entrega del proyecto.",
    estado: "confirmado",
    offsetDays: 0,
  },
  {
    shareCode: "PLZ-SEED2D",
    owner: "usuario1",
    titulo: "Entrega del informe",
    description: "Plan con fecha vencida que sigue pendiente.",
    estado: "pendiente",
    offsetDays: -2,
  },
  {
    shareCode: "PLZ-SEED2E",
    owner: "usuario1",
    titulo: "Viaje a la playa",
    description: "Plan cancelado por mal clima.",
    estado: "cancelado",
    offsetDays: -5,
  },
  {
    shareCode: "PLZ-SEED2F",
    owner: "usuario2",
    titulo: "Cena de graduación",
    description: "Plan de Usuario Dos al que se une Usuario Uno como invitado.",
    estado: "pendiente",
    offsetDays: 20,
    guest: "usuario1",
  },
];

/** Resolve the demo plans against a run date (UTC calendar day), adding the computed due date. */
export function buildDemoPlans(today: Date): DemoPlan[] {
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return DEMO_PLAN_DEFINITIONS.map((definition) => ({
    ...definition,
    dueDate: new Date(base + definition.offsetDays * 86_400_000),
  }));
}
