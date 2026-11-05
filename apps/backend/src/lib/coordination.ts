import { boliviaToday, isRealCalendarDate } from "./schemas.js";

export type OptionKind = "fecha" | "lugar";

export type Proposal =
  | { ok: true; kind: OptionKind; label: string }
  | { ok: false; message: string };

// Una propuesta es una fecha o un lugar, con un texto corto.
export function readProposal(kind: string, label: string): Proposal {
  const text = label.trim();
  if (kind !== "fecha" && kind !== "lugar") {
    return { ok: false, message: "Elige fecha o lugar." };
  }
  if (text.length < 2) {
    return { ok: false, message: "Escribe la fecha o el lugar." };
  }
  if (text.length > 120) {
    return { ok: false, message: "Usa como máximo 120 caracteres." };
  }
  if (kind === "fecha") {
    if (!isRealCalendarDate(text)) return { ok: false, message: "Ingresa una fecha válida." };
    if (text < boliviaToday()) {
      return { ok: false, message: "La fecha propuesta no puede ser anterior a hoy." };
    }
  }
  return { ok: true, kind, label: text };
}
