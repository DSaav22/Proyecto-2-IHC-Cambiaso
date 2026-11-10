import { describe, expect, it } from "vitest";
import { describeBalance, formatBs, parseBsToCents, sumTypedAmounts } from "./money";

describe("formatBs", () => {
  it("shows bolivianos with two decimals and a comma", () => {
    expect(formatBs(12050)).toBe("Bs 120,50");
    expect(formatBs(7)).toBe("Bs 0,07");
  });

  it("drops the sign so the wording carries it", () => {
    expect(formatBs(-4000)).toBe("Bs 40,00");
  });
});

describe("parseBsToCents", () => {
  it("accepts comma or dot decimals", () => {
    expect(parseBsToCents("120,50")).toBe(12050);
    expect(parseBsToCents(" 99.9 ")).toBe(9990);
    expect(parseBsToCents("80")).toBe(8000);
  });

  it("rejects text, negatives and more than two decimals", () => {
    for (const value of ["", "abc", "-5", "1.234"]) {
      expect(parseBsToCents(value)).toBeNull();
    }
  });
});

describe("describeBalance", () => {
  it("labels credit, debt and settled balances", () => {
    expect(describeBalance(18000)).toEqual({ label: "Le deben Bs 180,00", tone: "credit" });
    expect(describeBalance(-14000)).toEqual({ label: "Debe Bs 140,00", tone: "debt" });
    expect(describeBalance(0)).toEqual({ label: "Al día", tone: "settled" });
  });
});

describe("sumTypedAmounts", () => {
  it("adds the valid amounts and ignores empty or invalid fields", () => {
    expect(sumTypedAmounts(["20", "60,50", "", "x"])).toBe(8050);
  });
});
