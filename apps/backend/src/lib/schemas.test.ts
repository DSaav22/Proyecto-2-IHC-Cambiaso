import { describe, expect, it } from "vitest";
import { fieldErrors, planSchema, planStatusValues } from "./schemas.js";

const valid = {
  titulo: "Cena de Navidad",
  description: "Cena de grupo",
  dueDate: "2026-12-24",
};

describe("planSchema", () => {
  it("accepts valid input and trims whitespace", () => {
    const result = planSchema.safeParse({
      titulo: "  Cena de Navidad  ",
      description: "  Cena de grupo  ",
      dueDate: "2026-12-24",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it("rejects empty and whitespace-only titulo", () => {
    const result = planSchema.safeParse({ ...valid, titulo: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toHaveProperty("titulo");
    }
  });

  it("rejects titulo shorter than 3 characters", () => {
    const result = planSchema.safeParse({ ...valid, titulo: "AB" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).titulo).toBe("El título debe tener al menos 3 caracteres");
    }
    expect(planSchema.safeParse({ ...valid, titulo: "ABC" }).success).toBe(true);
  });

  it("rejects over-long titulo (>100)", () => {
    const tooLong = planSchema.safeParse({ ...valid, titulo: "t".repeat(101) });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(fieldErrors(tooLong.error).titulo).toBe("El título debe tener máximo 100 caracteres");
    }
    expect(planSchema.safeParse({ ...valid, titulo: "t".repeat(100) }).success).toBe(true);
  });

  it("rejects empty and whitespace-only description", () => {
    const result = planSchema.safeParse({ ...valid, description: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["description"]);
    }
  });

  it("rejects over-long description (>500)", () => {
    const longDesc = planSchema.safeParse({ ...valid, description: "d".repeat(501) });
    expect(longDesc.success).toBe(false);
    expect(planSchema.safeParse({ ...valid, description: "d".repeat(500) }).success).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    for (const dueDate of ["", "24/12/2026", "2026-13-01", "2026-02-30", "2025-02-29", "abc"]) {
      const result = planSchema.safeParse({ ...valid, dueDate });
      expect(result.success, dueDate).toBe(false);
      if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("dueDate");
    }
  });

  it("accepts a leap-day and past dates", () => {
    expect(planSchema.safeParse({ ...valid, dueDate: "2028-02-29" }).success).toBe(true);
    expect(planSchema.safeParse({ ...valid, dueDate: "2001-01-01" }).success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = planSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["description", "dueDate", "titulo"]);
    }
  });

  it("strips client-sent id and code from the parsed data", () => {
    const result = planSchema.safeParse({ ...valid, id: "evil", code: "PLAN-001" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(valid);
  });

  it("exposes borrador, confirmado and cancelado as plan states", () => {
    expect([...planStatusValues]).toEqual(["borrador", "confirmado", "cancelado"]);
  });

  it("drops a client-sent estado from the parsed data", () => {
    const result = planSchema.safeParse({ ...valid, estado: "confirmado" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("estado");
  });
});
