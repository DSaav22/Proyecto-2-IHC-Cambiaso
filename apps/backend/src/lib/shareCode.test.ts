import { describe, expect, it } from "vitest";
import { generateShareCode } from "./shareCode.js";

describe("generateShareCode", () => {
  it("generates a code starting with PLZ- prefix", () => {
    const code = generateShareCode();
    expect(code.startsWith("PLZ-")).toBe(true);
  });

  it("matches the expected alphanumeric pattern", () => {
    const code = generateShareCode();
    expect(code).toMatch(/^PLZ-[A-Z2-9]{6}$/);
  });

  it("produces different codes on consecutive calls", () => {
    const code1 = generateShareCode();
    const code2 = generateShareCode();
    expect(code1).not.toBe(code2);
  });

  it("respects custom length parameter", () => {
    const code = generateShareCode(8);
    expect(code).toMatch(/^PLZ-[A-Z2-9]{8}$/);
  });
});
