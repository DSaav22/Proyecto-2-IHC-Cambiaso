import { describe, expect, it } from "vitest";
import type { Plan } from "../api/client";
import {
  countPlansBySection,
  filterPlansBySection,
  parsePlanSection,
  withPlanSection,
} from "./planSections";

const base: Plan = {
  id: "p1",
  titulo: "Cena",
  description: "Cena de grupo",
  dueDate: "2026-12-24",
  estado: "pendiente",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const owned: Plan = { ...base, id: "own", isOwner: true };
const legacy: Plan = { ...base, id: "legacy" };
const guest: Plan = { ...base, id: "guest", isOwner: false };

describe("parsePlanSection", () => {
  it("defaults to todos when the param is missing", () => {
    expect(parsePlanSection(new URLSearchParams())).toBe("todos");
  });

  it("reads the known sections", () => {
    expect(parsePlanSection(new URLSearchParams("vista=organizo"))).toBe("organizo");
    expect(parsePlanSection(new URLSearchParams("vista=invitado"))).toBe("invitado");
  });

  it("falls back to todos for unknown or explicit default values", () => {
    expect(parsePlanSection(new URLSearchParams("vista=zzz"))).toBe("todos");
    expect(parsePlanSection(new URLSearchParams("vista=todos"))).toBe("todos");
  });
});

describe("withPlanSection", () => {
  it("keeps the filter params and adds the section", () => {
    const params = withPlanSection(new URLSearchParams("estado=confirmado"), "invitado");
    expect(params.toString()).toBe("estado=confirmado&vista=invitado");
  });

  it("omits the default section", () => {
    const params = withPlanSection(new URLSearchParams("vista=organizo&q=cena"), "todos");
    expect(params.toString()).toBe("q=cena");
  });
});

describe("filterPlansBySection", () => {
  const plans = [owned, guest, legacy];

  it("returns every plan for todos", () => {
    expect(filterPlansBySection(plans, "todos")).toEqual(plans);
  });

  it("treats plans without isOwner as created by the user", () => {
    expect(filterPlansBySection(plans, "organizo").map((p) => p.id)).toEqual(["own", "legacy"]);
  });

  it("returns only the plans of other people for invitado", () => {
    expect(filterPlansBySection(plans, "invitado").map((p) => p.id)).toEqual(["guest"]);
  });
});

describe("countPlansBySection", () => {
  it("counts each section from the same list", () => {
    expect(countPlansBySection([owned, guest, legacy])).toEqual({ todos: 3, organizo: 2, invitado: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(countPlansBySection([])).toEqual({ todos: 0, organizo: 0, invitado: 0 });
  });
});
