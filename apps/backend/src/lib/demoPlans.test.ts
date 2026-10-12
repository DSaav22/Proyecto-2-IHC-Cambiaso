import { describe, expect, it } from "vitest";
import { buildDemoPlans, DEMO_PLAN_DEFINITIONS } from "./demoPlans";

const TODAY = new Date("2026-06-15T18:30:00.000Z");

describe("buildDemoPlans", () => {
  it("uses unique, stable PLZ-SEED2A..F share codes as identifiers", () => {
    const codes = buildDemoPlans(TODAY).map((p) => p.shareCode);
    expect(codes).toEqual(["A", "B", "C", "D", "E", "F"].map((l) => `PLZ-SEED2${l}`));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("covers pendiente, confirmado and cancelado", () => {
    const states = new Set(buildDemoPlans(TODAY).map((p) => p.estado));
    expect(states).toEqual(new Set(["pendiente", "confirmado", "cancelado"]));
  });

  it("computes due dates at UTC midnight relative to the run date", () => {
    const byCode = Object.fromEntries(buildDemoPlans(TODAY).map((p) => [p.shareCode, p.dueDate.toISOString()]));
    expect(byCode["PLZ-SEED2C"]).toBe("2026-06-15T00:00:00.000Z");
    expect(byCode["PLZ-SEED2A"]).toBe("2026-06-18T00:00:00.000Z");
    expect(byCode["PLZ-SEED2D"]).toBe("2026-06-13T00:00:00.000Z");
    expect(byCode["PLZ-SEED2F"]).toBe("2026-07-05T00:00:00.000Z");
  });

  it("spans overdue, today and upcoming due dates", () => {
    const offsets = DEMO_PLAN_DEFINITIONS.map((p) => p.offsetDays);
    expect(offsets.some((d) => d < 0)).toBe(true);
    expect(offsets).toContain(0);
    expect(offsets.some((d) => d > 0 && d <= 7)).toBe(true);
    expect(offsets.some((d) => d > 7)).toBe(true);
  });

  it("keeps titles distinct so a text search returns only some plans", () => {
    const titles = buildDemoPlans(TODAY).map((p) => p.titulo.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    const matches = titles.filter((t) => t.includes("cena"));
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(titles.length);
  });

  it("has exactly one guest membership and never on the owner's own plan", () => {
    const guested = buildDemoPlans(TODAY).filter((p) => p.guest);
    expect(guested).toHaveLength(1);
    expect(guested[0].guest).not.toBe(guested[0].owner);
  });

  it("keeps the only cancelled plan owned by usuario1 so it is visible under Cancelado", () => {
    const cancelled = buildDemoPlans(TODAY).filter((p) => p.estado === "cancelado");
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].owner).toBe("usuario1");
  });
});
