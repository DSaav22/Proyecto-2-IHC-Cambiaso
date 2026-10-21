import type { ActivityAction, ActivityFilter } from "../api/client";

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  created: "Plan creado",
  confirmed: "Plan confirmado",
  cancelled: "Plan cancelado",
  edited: "Plan editado",
  joined: "Nuevo participante",
  left: "Un participante salió",
};

export const ACTIVITY_FILTER_LABELS: Record<ActivityFilter, string> = {
  todos: "Todos",
  estados: "Estados",
  creaciones: "Creaciones",
  participacion: "Participación",
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const exactFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/La_Paz",
});

/** Exact date and time in Bolivia, e.g. "21 oct 2026, 11:30". */
export function formatExactTime(iso: string): string {
  return exactFormatter.format(new Date(iso));
}

/** Relative time in Spanish; events older than a week fall back to the exact date. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  if (diff < MINUTE) return "Hace un momento";
  if (diff < HOUR) return `Hace ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `Hace ${Math.floor(diff / HOUR)} h`;
  if (diff < 7 * DAY) return `Hace ${Math.floor(diff / DAY)} d`;
  return formatExactTime(iso);
}
