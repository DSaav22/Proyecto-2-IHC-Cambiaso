import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  PLAN_DATE_FILTERS,
  fieldErrors,
  isRealCalendarDate,
  planListQuerySchema,
  planSchema,
  planStatusValues,
} from "./schemas.js";

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

  it("exposes pendiente, confirmado and cancelado as plan states", () => {
    expect([...planStatusValues]).toEqual(["pendiente", "confirmado", "cancelado"]);
  });

  it("accepts pendiente and rejects the retired borrador value as a plan state", () => {
    const stateEnum = z.enum(planStatusValues);
    expect(stateEnum.safeParse("pendiente").success).toBe(true);
    expect(stateEnum.safeParse("borrador").success).toBe(false);
    expect(planStatusValues).not.toContain("borrador");
  });

  it("drops a client-sent estado from the parsed data", () => {
    const result = planSchema.safeParse({ ...valid, estado: "confirmado" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("estado");
  });
});

describe("planListQuerySchema", () => {
  it("accepts an empty query and returns no filters", () => {
    const result = planListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBeUndefined();
      expect(result.data.estado).toBeUndefined();
      expect(result.data.fecha).toBeUndefined();
      expect(result.data.today).toBeUndefined();
    }
  });

  it("trims q and turns a blank q into undefined", () => {
    const trimmed = planListQuerySchema.safeParse({ q: "  cena  " });
    expect(trimmed.success && trimmed.data.q).toBe("cena");
    const blank = planListQuerySchema.safeParse({ q: "   " });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.q).toBeUndefined();
  });

  it("rejects q longer than 100 characters and accepts exactly 100", () => {
    const tooLong = planListQuerySchema.safeParse({ q: "a".repeat(101) });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(fieldErrors(tooLong.error).q).toBe("La búsqueda debe tener máximo 100 caracteres");
    }
    expect(planListQuerySchema.safeParse({ q: "a".repeat(100) }).success).toBe(true);
  });

  it("rejects repeated q (array) values", () => {
    const result = planListQuerySchema.safeParse({ q: ["a", "b"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("q");
  });

  it("accepts pendiente, confirmado and cancelado and rejects borrador or unknown estado", () => {
    for (const estado of ["pendiente", "confirmado", "cancelado"]) {
      expect(planListQuerySchema.safeParse({ estado }).success, estado).toBe(true);
    }
    for (const estado of ["borrador", "zzz", ""]) {
      const result = planListQuerySchema.safeParse({ estado });
      expect(result.success, estado).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).estado).toBe("Estado inválido");
    }
  });

  it("accepts every date filter and rejects unknown fecha", () => {
    expect([...PLAN_DATE_FILTERS]).toEqual(["today", "next7", "next30", "overdue"]);
    for (const fecha of PLAN_DATE_FILTERS) {
      expect(planListQuerySchema.safeParse({ fecha }).success, fecha).toBe(true);
    }
    const result = planListQuerySchema.safeParse({ fecha: "tomorrow" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).fecha).toBe("Filtro de fecha inválido");
  });

  it("validates today as a real calendar date", () => {
    expect(planListQuerySchema.safeParse({ today: "2026-06-15" }).success).toBe(true);
    for (const today of ["2026-02-30", "2026-13-01", "15/06/2026", ""]) {
      const result = planListQuerySchema.safeParse({ today });
      expect(result.success, today).toBe(false);
      if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("today");
    }
  });

  it("strips unknown keys", () => {
    const result = planListQuerySchema.safeParse({ q: "x", userId: "evil", page: "2" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ q: "x" });
  });

  it("exports isRealCalendarDate for reuse", () => {
    expect(isRealCalendarDate("2028-02-29")).toBe(true);
    expect(isRealCalendarDate("2026-02-29")).toBe(false);
  });
});
