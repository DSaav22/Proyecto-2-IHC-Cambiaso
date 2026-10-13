import { afterEach, describe, expect, it, vi } from "vitest";
import { daysUntil, localToday, PLAN_STATUS_LABELS } from "./plans";

describe("localToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats the local calendar date as YYYY-MM-DD", () => {
    expect(localToday(new Date(2026, 5, 15, 10, 0))).toBe("2026-06-15");
  });

  it("keeps the local date late in the evening instead of the UTC date", () => {
    expect(localToday(new Date(2026, 5, 15, 23, 30))).toBe("2026-06-15");
  });

  it("zero-pads single digit months and days", () => {
    expect(localToday(new Date(2026, 0, 5, 8, 0))).toBe("2026-01-05");
  });

  it("defaults to the current system date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 15, 23, 30));
    expect(localToday()).toBe("2026-06-15");
  });
});

describe("daysUntil", () => {
  it("counts local calendar days from today", () => {
    const now = new Date(2026, 5, 15, 23, 30);
    expect(daysUntil("2026-06-15", now)).toBe(0);
    expect(daysUntil("2026-06-18", now)).toBe(3);
    expect(daysUntil("2026-06-14", now)).toBe(-1);
  });
});

describe("PLAN_STATUS_LABELS", () => {
  it("maps every state to its capitalized label", () => {
    expect(PLAN_STATUS_LABELS).toEqual({
      pendiente: "Pendiente",
      confirmado: "Confirmado",
      cancelado: "Cancelado",
    });
  });

  it("has no label for the retired borrador state", () => {
    expect(Object.keys(PLAN_STATUS_LABELS)).not.toContain("borrador");
  });
});
