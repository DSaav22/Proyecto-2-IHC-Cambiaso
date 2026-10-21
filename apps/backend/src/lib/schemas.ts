import { z } from "zod";
import { PLAN_STATES } from "./planState.js";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Correo electrónico inválido"));

const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const recoverSchema = z.object({ email });

export const recoverConfirmSchema = z.object({
  email,
  token: z.string().min(1, "El token es obligatorio"),
  newPassword: password,
});

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export { PLAN_STATES as planStatusValues, type PlanState as PlanStatus } from "./planState.js";

export const planSchema = z.object({
  titulo: z
    .string("El título es obligatorio")
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(100, "El título debe tener máximo 100 caracteres"),
  description: z
    .string("La descripción es obligatoria")
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(500, "La descripción debe tener máximo 500 caracteres"),
  dueDate: z
    .string("La fecha límite es obligatoria")
    .refine(isRealCalendarDate, "Ingresa una fecha válida"),
});

export type PlanInput = z.infer<typeof planSchema>;

export const PLAN_DATE_FILTERS = ["today", "next7", "next30", "overdue"] as const;
export type PlanDateFilter = (typeof PLAN_DATE_FILTERS)[number];

/** Query string of `GET /api/plans`. Unknown keys are stripped; repeated params fail. */
export const planListQuerySchema = z.object({
  q: z
    .string("Búsqueda inválida")
    .trim()
    .max(100, "La búsqueda debe tener máximo 100 caracteres")
    .optional()
    .transform((value) => value || undefined),
  estado: z.enum(PLAN_STATES, "Estado inválido").optional(),
  fecha: z.enum(PLAN_DATE_FILTERS, "Filtro de fecha inválido").optional(),
  today: z
    .string("Fecha inválida")
    .refine(isRealCalendarDate, "Ingresa una fecha válida")
    .optional(),
});

export type PlanListQuery = z.infer<typeof planListQuerySchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "body");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

// --- Plan activity history (GET /api/plans/activity) ---

export const ACTIVITY_ACTIONS = ["created", "confirmed", "cancelled", "edited", "joined", "left"] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_FILTERS = ["todos", "estados", "creaciones", "participacion"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

/** Actions matched by each thematic filter; `null` means no action restriction. */
export const ACTIVITY_FILTER_ACTIONS: Record<ActivityFilter, readonly ActivityAction[] | null> = {
  todos: null,
  estados: ["confirmed", "cancelled"],
  creaciones: ["created"],
  participacion: ["joined", "left"],
};

/** Query string of `GET /api/plans/activity`. */
export const activityQuerySchema = z.object({
  tipo: z
    .enum(ACTIVITY_FILTERS, "Filtro de actividad inválido")
    .optional()
    .default("todos"),
});

export interface RecordActivityInput {
  planId: string | null;
  userId: string;
  planTitle: string;
  action: ActivityAction;
  previousState?: string | null;
  newState?: string | null;
  details?: Record<string, unknown> | null;
}

/** Activity event as returned by the service layer. */
export interface ActivityEvent {
  id: string;
  action: ActivityAction;
  planId: string | null;
  planTitle: string;
  previousState: string | null;
  newState: string | null;
  /** Current state of the plan; `null` when the plan no longer exists. */
  planEstado: string | null;
  actorName: string;
  createdAt: Date;
}

/** JSON shape of an activity event in the API response. */
export interface ActivityEventResponse extends Omit<ActivityEvent, "createdAt"> {
  createdAt: string;
}

export interface ActivityListResponse {
  activities: ActivityEventResponse[];
}
