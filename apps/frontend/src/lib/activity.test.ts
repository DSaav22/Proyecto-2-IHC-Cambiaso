import { describe, expect, it } from "vitest";
import { ACTIVITY_ACTION_LABELS, formatExactTime, formatRelativeTime } from "./activity";

const now = new Date("2026-10-21T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("formatRelativeTime", () => {
  it("says 'Hace un momento' for less than a minute", () => {
    expect(formatRelativeTime(ago(20_000), now)).toBe("Hace un momento");
  });

  it("uses minutes under an hour", () => {
    expect(formatRelativeTime(ago(15 * 60_000), now)).toBe("Hace 15 min");
  });

  it("uses hours under a day", () => {
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe("Hace 3 h");
  });

  it("uses days under a week and falls back to a date after that", () => {
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe("Hace 2 d");
    expect(formatRelativeTime(ago(30 * 86_400_000), now)).toMatch(/2026/);
  });
});

describe("activity labels and exact time", () => {
  it("labels every action in Spanish", () => {
    expect(ACTIVITY_ACTION_LABELS.created).toBe("Plan creado");
    expect(ACTIVITY_ACTION_LABELS.confirmed).toBe("Plan confirmado");
    expect(ACTIVITY_ACTION_LABELS.cancelled).toBe("Plan cancelado");
    expect(ACTIVITY_ACTION_LABELS.joined).toBe("Nuevo participante");
  });

  it("formats the exact time with the year", () => {
    expect(formatExactTime("2026-10-21T15:30:00.000Z")).toMatch(/2026/);
  });
});
