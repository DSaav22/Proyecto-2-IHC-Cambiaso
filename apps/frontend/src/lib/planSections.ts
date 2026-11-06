import type { Plan } from "../api/client";

/**
 * Sections split "Mis planes" by the user's role in each plan. They are navigation,
 * not filters: they live in their own URL key (`vista`) and "Limpiar filtros" keeps them.
 */
export type PlanSection = "todos" | "organizo" | "invitado";

export const PLAN_SECTIONS: readonly PlanSection[] = ["todos", "organizo", "invitado"];

export const PLAN_SECTION_LABELS: Record<PlanSection, string> = {
  todos: "Todos",
  organizo: "Organizo yo",
  invitado: "Me invitaron",
};

export const PLAN_SECTION_EMPTY_TEXT: Record<PlanSection, string> = {
  todos: "No hay planes en esta vista.",
  organizo: "No hay planes creados por ti en esta vista.",
  invitado: "No hay planes de otras personas en esta vista. Únete a uno con su código.",
};

const SECTION_PARAM = "vista";

/** Reads the section from the URL; unknown values fall back to "todos". */
export function parsePlanSection(params: URLSearchParams): PlanSection {
  const value = params.get(SECTION_PARAM);
  return PLAN_SECTIONS.find((section) => section !== "todos" && section === value) ?? "todos";
}

/** Adds the section to already serialized filter params, omitting the default. */
export function withPlanSection(params: URLSearchParams, section: PlanSection): URLSearchParams {
  const next = new URLSearchParams(params);
  if (section === "todos") next.delete(SECTION_PARAM);
  else next.set(SECTION_PARAM, section);
  return next;
}

function isOwned(plan: Plan): boolean {
  return plan.isOwner ?? true;
}

export function filterPlansBySection(plans: Plan[], section: PlanSection): Plan[] {
  if (section === "todos") return plans;
  return plans.filter((plan) => (section === "organizo" ? isOwned(plan) : !isOwned(plan)));
}

export function countPlansBySection(plans: Plan[]): Record<PlanSection, number> {
  const owned = plans.filter(isOwned).length;
  return { todos: plans.length, organizo: owned, invitado: plans.length - owned };
}
