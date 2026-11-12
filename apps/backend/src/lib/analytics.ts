import { z } from "zod";

const none = z.object({}).strict();
const reason = <T extends [string, ...string[]]>(values: T) =>
  z.object({ motivo: z.enum(values) }).strict();

// Only these events and properties are accepted, so no personal data can be stored.
const EVENTS = {
  plan_creacion_iniciada: none,
  plan_creado: none,
  plan_confirmado: z.object({ via: z.enum(["boton", "votacion"]) }).strict(),
  union_iniciada: none,
  plan_unido: none,
  union_fallida: reason(["no_existe", "ya_unido", "no_valido"]),
  gasto_iniciado: none,
  gasto_registrado: z.object({ modo: z.enum(["igual", "personalizado"]) }).strict(),
  gasto_rechazado: reason(["no_suma_total", "plan_cancelado", "dato_invalido"]),
  pago_registrado: none,
  pago_confirmado: none,
  retiro_iniciado: none,
  plan_abandonado: z.object({ tenia_votos: z.boolean() }).strict(),
  retiro_bloqueado: reason(["deuda_pendiente", "plan_cerrado", "organizador"]),
  busqueda_sin_resultados: z.object({ filtro: z.enum(["texto", "estado", "fecha", "varios"]) }).strict(),
};

export type EventName = keyof typeof EVENTS;
export type EventProps = Record<string, string | boolean>;

export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];

export function parseEvent(body: unknown) {
  const { event, props } = (body ?? {}) as { event?: unknown; props?: unknown };
  if (typeof event !== "string" || !EVENT_NAMES.includes(event as EventName)) return null;

  const parsed = EVENTS[event as EventName].safeParse(props ?? {});
  if (!parsed.success) return null;
  return { event: event as EventName, props: parsed.data as EventProps };
}
