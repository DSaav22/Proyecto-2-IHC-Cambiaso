import { beforeEach, describe, expect, it, vi } from "vitest";

const planFindUnique = vi.hoisted(() => vi.fn());
const expenseFindMany = vi.hoisted(() => vi.fn());
const expenseCreate = vi.hoisted(() => vi.fn());
const paymentFindMany = vi.hoisted(() => vi.fn());
const paymentFindFirst = vi.hoisted(() => vi.fn());
const paymentCreate = vi.hoisted(() => vi.fn());
const paymentUpdateMany = vi.hoisted(() => vi.fn());
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    plan: { findUnique: planFindUnique },
    planExpense: { findMany: expenseFindMany, create: expenseCreate },
    planPayment: {
      findMany: paymentFindMany,
      findFirst: paymentFindFirst,
      create: paymentCreate,
      updateMany: paymentUpdateMany,
    },
  },
}));

import {
  addExpense,
  confirmPayment,
  ExpenseError,
  getExpenses,
  registerPayment,
  rejectPayment,
} from "./expenses.service.js";

const ANA = "ana";
const BETO = "beto";
const CARO = "caro";
const PLAN = "plan-1";

const person = (id: string) => ({ id, name: id.toUpperCase() });

function storedPlan(estado = "pendiente") {
  return {
    id: PLAN,
    userId: ANA,
    estado,
    user: person(ANA),
    members: [{ user: person(BETO) }, { user: person(CARO) }],
  };
}

// Ana paid Bs 300 split in three: Beto and Caro owe Bs 100 each.
const dinner = {
  id: "exp-1",
  description: "Cena",
  amountCents: 30000,
  splitMode: "igual",
  paidById: ANA,
  paidBy: person(ANA),
  createdAt: new Date("2026-11-10T12:00:00.000Z"),
  shares: [ANA, BETO, CARO].map((userId) => ({
    userId,
    amountCents: 10000,
    user: person(userId),
  })),
};

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-1",
    planId: PLAN,
    fromUserId: CARO,
    toUserId: ANA,
    fromUser: person(CARO),
    toUser: person(ANA),
    amountCents: 10000,
    status: "pendiente",
    rejectReason: null,
    createdAt: new Date("2026-11-10T13:00:00.000Z"),
    ...overrides,
  };
}

async function expectExpenseError(promise: Promise<unknown>, status: number, message: string) {
  const error = await promise.catch((err: unknown) => err);
  expect(error).toBeInstanceOf(ExpenseError);
  expect(error).toMatchObject({ status, message });
}

beforeEach(() => {
  vi.clearAllMocks();
  planFindUnique.mockResolvedValue(storedPlan());
  expenseFindMany.mockResolvedValue([dinner]);
  paymentFindMany.mockResolvedValue([]);
});

describe("getExpenses", () => {
  it("returns each participant's balance from the expenses", async () => {
    const view = await getExpenses(BETO, PLAN);
    expect(view.participants.map((p) => [p.id, p.balanceCents])).toEqual([
      [ANA, 20000],
      [BETO, -10000],
      [CARO, -10000],
    ]);
  });

  it("hides the plan from people outside it", async () => {
    await expectExpenseError(getExpenses("intruso", PLAN), 404, "Plan no encontrado");
  });
});

describe("addExpense", () => {
  it("rejects a custom split that does not match the total", async () => {
    await expectExpenseError(
      addExpense(ANA, PLAN, {
        description: "Taxi",
        amount: 6000,
        paidById: BETO,
        splitMode: "personalizado",
        shares: [{ userId: ANA, amount: 1000 }],
      }),
      400,
      "Los montos suman Bs 10,00 y el gasto es de Bs 60,00.",
    );
    expect(expenseCreate).not.toHaveBeenCalled();
  });

  it("does not accept new expenses in a cancelled plan", async () => {
    planFindUnique.mockResolvedValue(storedPlan("cancelado"));
    await expectExpenseError(
      addExpense(ANA, PLAN, {
        description: "Taxi",
        amount: 6000,
        paidById: ANA,
        splitMode: "igual",
        participantIds: [ANA, BETO],
      }),
      409,
      "Un plan cancelado no admite gastos nuevos.",
    );
  });
});

describe("registerPayment", () => {
  it("creates a pending payment for what the person owes", async () => {
    await registerPayment(CARO, PLAN, { toUserId: ANA, amount: 10000 });
    expect(paymentCreate).toHaveBeenCalledWith({
      data: { planId: PLAN, fromUserId: CARO, toUserId: ANA, amountCents: 10000 },
    });
  });

  it("refuses a second pending payment to the same person", async () => {
    paymentFindMany.mockResolvedValue([payment({ amountCents: 5000 })]);
    await expectExpenseError(
      registerPayment(CARO, PLAN, { toUserId: ANA, amount: 5000 }),
      409,
      "Ya tienes un pago pendiente con esa persona. Espera a que lo confirme o lo rechace.",
    );
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it("refuses to pay more than the debt", async () => {
    await expectExpenseError(
      registerPayment(CARO, PLAN, { toUserId: ANA, amount: 15000 }),
      409,
      "No puedes pagar más de lo que debes (Bs 100,00).",
    );
  });

  it("refuses payments to someone without credit", async () => {
    await expectExpenseError(
      registerPayment(CARO, PLAN, { toUserId: BETO, amount: 1000 }),
      400,
      "Esa persona no tiene saldo a favor.",
    );
  });
});

describe("confirmPayment / rejectPayment", () => {
  beforeEach(() => {
    paymentFindFirst.mockResolvedValue(payment());
    paymentUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("only lets the receiver confirm", async () => {
    await expectExpenseError(
      confirmPayment(CARO, PLAN, "pay-1"),
      403,
      "Solo quien recibe el pago puede confirmarlo o rechazarlo.",
    );
    expect(paymentUpdateMany).not.toHaveBeenCalled();
  });

  it("confirms only while the payment is still pending", async () => {
    await confirmPayment(ANA, PLAN, "pay-1");
    expect(paymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "pay-1", status: "pendiente" },
      data: expect.objectContaining({ status: "confirmado", rejectReason: null }),
    });
  });

  it("does not apply a payment twice", async () => {
    paymentUpdateMany.mockResolvedValue({ count: 0 });
    await expectExpenseError(
      confirmPayment(ANA, PLAN, "pay-1"),
      409,
      "Este pago ya fue confirmado o rechazado.",
    );
  });

  it("stores the reason when the receiver rejects", async () => {
    await rejectPayment(ANA, PLAN, "pay-1", "No me llegó la transferencia");
    expect(paymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "pay-1", status: "pendiente" },
      data: expect.objectContaining({
        status: "rechazado",
        rejectReason: "No me llegó la transferencia",
      }),
    });
  });
});
