import { z } from "zod";

// Only these events and properties are accepted, so no personal data can be stored.
const EVENTS = {
  plan_creacion_iniciada: z.object({}).strict(),
  plan_confirmado: z.object({ via: z.enum(["boton", "votacion"]) }).strict(),
};

export type EventName = keyof typeof EVENTS;

export function parseEvent(body: unknown) {
  const { event, props } = (body ?? {}) as { event?: unknown; props?: unknown };
  if (typeof event !== "string" || !Object.keys(EVENTS).includes(event)) return null;

  const parsed = EVENTS[event as EventName].safeParse(props ?? {});
  if (!parsed.success) return null;
  return { event: event as EventName, props: parsed.data as Record<string, string> };
}

export function completionRate(started: number, finished: number) {
  return started > 0 ? Math.round((finished / started) * 100) : 0;
}
