import { describe, expect, it } from "vitest";
import { readProposal } from "./coordination.js";

describe("readProposal", () => {
  it("acepta un lugar y le quita los espacios", () => {
    expect(readProposal("lugar", "  Parque central  ")).toEqual({
      ok: true,
      kind: "lugar",
      label: "Parque central",
    });
  });

  it("acepta una fecha", () => {
    expect(readProposal("fecha", "2026-11-08")).toEqual({
      ok: true,
      kind: "fecha",
      label: "2026-11-08",
    });
  });

  it("rechaza un tipo que no sea fecha o lugar", () => {
    expect(readProposal("hora", "18:00").ok).toBe(false);
  });

  it("rechaza un texto vacío", () => {
    const result = readProposal("lugar", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/lugar/);
  });

  it("rechaza un texto de más de 120 caracteres", () => {
    expect(readProposal("lugar", "a".repeat(121)).ok).toBe(false);
  });
});
