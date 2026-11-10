import { describe, expect, it } from "vitest";
import {
  buildShares,
  computeBalances,
  expenseInputSchema,
  formatBs,
  splitEqually,
  type ExpenseInput,
} from "./expenses.js";

const PEOPLE = ["ana", "beto", "caro"];

function input(overrides: Partial<ExpenseInput>): ExpenseInput {
  return {
    description: "Cena",
    amount: 30000,
    paidById: "ana",
    splitMode: "igual",
    participantIds: PEOPLE,
    ...overrides,
  };
}

describe("expenseInputSchema amount", () => {
  it("reads comma or dot decimals as cents", () => {
    const parsed = expenseInputSchema.parse({ ...input({}), amount: "120,50" });
    expect(parsed.amount).toBe(12050);
    expect(expenseInputSchema.parse({ ...input({}), amount: 99.9 }).amount).toBe(9990);
  });

  it("rejects zero, negatives and more than 2 decimals", () => {
    for (const amount of ["0", "-5", "10.123", "abc"]) {
      expect(expenseInputSchema.safeParse({ ...input({}), amount }).success).toBe(false);
    }
  });
});

describe("splitEqually", () => {
  it("splits an exact amount in equal parts", () => {
    expect(splitEqually(30000, PEOPLE).map((s) => s.amountCents)).toEqual([10000, 10000, 10000]);
  });

  it("gives the leftover cents to the first people and keeps the total", () => {
    const shares = splitEqually(10000, PEOPLE);
    expect(shares.map((s) => s.amountCents)).toEqual([3334, 3333, 3333]);
    expect(shares.reduce((sum, s) => sum + s.amountCents, 0)).toBe(10000);
  });
});

describe("buildShares", () => {
  it("accepts a custom split whose sum matches the total", () => {
    const result = buildShares(
      input({
        amount: 12000,
        splitMode: "personalizado",
        shares: [
          { userId: "ana", amount: 2000 },
          { userId: "beto", amount: 6000 },
          { userId: "caro", amount: 4000 },
        ],
      }),
      PEOPLE,
    );
    expect(result).toEqual({
      ok: true,
      shares: [
        { userId: "ana", amountCents: 2000 },
        { userId: "beto", amountCents: 6000 },
        { userId: "caro", amountCents: 4000 },
      ],
    });
  });

  it("rejects a custom split that does not add up to the total", () => {
    const result = buildShares(
      input({
        amount: 12000,
        splitMode: "personalizado",
        shares: [
          { userId: "ana", amount: 2000 },
          { userId: "beto", amount: 6000 },
        ],
      }),
      PEOPLE,
    );
    expect(result).toEqual({
      ok: false,
      message: "Los montos suman Bs 80,00 y el gasto es de Bs 120,00.",
    });
  });

  it("rejects people who are not in the plan", () => {
    const result = buildShares(input({ participantIds: ["ana", "intruso"] }), PEOPLE);
    expect(result.ok).toBe(false);
  });

  it("requires at least one person in an equal split", () => {
    expect(buildShares(input({ participantIds: [] }), PEOPLE)).toEqual({
      ok: false,
      message: "Elige al menos un participante.",
    });
  });
});

describe("computeBalances", () => {
  const expenses = [
    { paidById: "ana", amountCents: 30000, shares: splitEqually(30000, PEOPLE) },
    {
      paidById: "beto",
      amountCents: 12000,
      shares: [
        { userId: "ana", amountCents: 2000 },
        { userId: "beto", amountCents: 6000 },
        { userId: "caro", amountCents: 4000 },
      ],
    },
  ];

  it("credits the payer and debits each share", () => {
    const balances = computeBalances(PEOPLE, expenses, []);
    expect(Object.fromEntries(balances)).toEqual({ ana: 18000, beto: -4000, caro: -14000 });
  });

  it("ignores pending and rejected payments", () => {
    const balances = computeBalances(PEOPLE, expenses, [
      { fromUserId: "caro", toUserId: "ana", amountCents: 14000, status: "pendiente" },
      { fromUserId: "beto", toUserId: "ana", amountCents: 4000, status: "rechazado" },
    ]);
    expect(Object.fromEntries(balances)).toEqual({ ana: 18000, beto: -4000, caro: -14000 });
  });

  it("moves both balances when a payment is confirmed", () => {
    const balances = computeBalances(PEOPLE, expenses, [
      { fromUserId: "caro", toUserId: "ana", amountCents: 14000, status: "confirmado" },
    ]);
    expect(Object.fromEntries(balances)).toEqual({ ana: 4000, beto: -4000, caro: 0 });
  });

  it("always sums zero across the group", () => {
    const balances = computeBalances(PEOPLE, expenses, []);
    expect([...balances.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("formatBs", () => {
  it("formats cents as bolivianos with a decimal comma", () => {
    expect(formatBs(12050)).toBe("Bs 120,50");
    expect(formatBs(5)).toBe("Bs 0,05");
  });
});
