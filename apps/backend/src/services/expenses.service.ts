import {
  buildShares,
  computeBalances,
  formatBs,
  type ExpenseInput,
} from "../lib/expenses.js";
import { prisma } from "../lib/prisma.js";

export class ExpenseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ExpenseError";
    this.status = status;
  }
}

async function requireParticipant(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      user: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!plan) throw new ExpenseError(404, "Plan no encontrado");

  const participants = [
    { id: plan.user.id, name: plan.user.name, role: "Creador" as const },
    ...plan.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      role: "Participante" as const,
    })),
  ];
  if (!participants.some((person) => person.id === userId)) {
    throw new ExpenseError(404, "Plan no encontrado");
  }
  return { plan, participants };
}

async function loadLedger(planId: string) {
  const [expenses, payments] = await Promise.all([
    prisma.planExpense.findMany({
      where: { planId },
      orderBy: { createdAt: "asc" },
      include: {
        paidBy: { select: { id: true, name: true } },
        shares: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.planPayment.findMany({
      where: { planId },
      orderBy: { createdAt: "asc" },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { expenses, payments };
}

type Ledger = Awaited<ReturnType<typeof loadLedger>>;

function balancesOf(participantIds: string[], ledger: Ledger) {
  return computeBalances(participantIds, ledger.expenses, ledger.payments);
}

export async function getBalanceCents(userId: string, planId: string) {
  const ledger = await loadLedger(planId);
  return balancesOf([userId], ledger).get(userId) ?? 0;
}

export async function getExpenses(userId: string, planId: string) {
  const { participants } = await requireParticipant(planId, userId);
  const ledger = await loadLedger(planId);
  const balances = balancesOf(
    participants.map((person) => person.id),
    ledger,
  );

  return {
    meId: userId,
    participants: participants.map((person) => ({
      ...person,
      balanceCents: balances.get(person.id) ?? 0,
    })),
    expenses: ledger.expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amountCents: expense.amountCents,
      splitMode: expense.splitMode,
      paidBy: expense.paidBy,
      shares: expense.shares.map((share) => ({
        userId: share.userId,
        name: share.user.name,
        amountCents: share.amountCents,
      })),
      createdAt: expense.createdAt.toISOString(),
    })),
    payments: ledger.payments.map((payment) => ({
      id: payment.id,
      from: payment.fromUser,
      to: payment.toUser,
      amountCents: payment.amountCents,
      status: payment.status,
      rejectReason: payment.rejectReason,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function addExpense(userId: string, planId: string, input: ExpenseInput) {
  const { plan, participants } = await requireParticipant(planId, userId);
  if (plan.estado === "cancelado") {
    throw new ExpenseError(409, "Un plan cancelado no admite gastos nuevos.");
  }
  const participantIds = participants.map((person) => person.id);
  if (!participantIds.includes(input.paidById)) {
    throw new ExpenseError(400, "Quien pagó tiene que ser participante del plan.");
  }
  const result = buildShares(input, participantIds);
  if (!result.ok) throw new ExpenseError(400, result.message);

  await prisma.planExpense.create({
    data: {
      planId,
      description: input.description,
      amountCents: input.amount,
      splitMode: input.splitMode,
      paidById: input.paidById,
      createdById: userId,
      shares: { create: result.shares },
    },
  });
  return getExpenses(userId, planId);
}

export async function registerPayment(
  userId: string,
  planId: string,
  input: { toUserId: string; amount: number },
) {
  const { participants } = await requireParticipant(planId, userId);
  if (input.toUserId === userId) {
    throw new ExpenseError(400, "No puedes registrar un pago a ti mismo.");
  }
  if (!participants.some((person) => person.id === input.toUserId)) {
    throw new ExpenseError(400, "Solo puedes pagarle a un participante del plan.");
  }

  const ledger = await loadLedger(planId);
  const pending = ledger.payments.filter(
    (payment) => payment.fromUserId === userId && payment.status === "pendiente",
  );
  if (pending.some((payment) => payment.toUserId === input.toUserId)) {
    throw new ExpenseError(
      409,
      "Ya tienes un pago pendiente con esa persona. Espera a que lo confirme o lo rechace.",
    );
  }

  const balances = balancesOf(
    participants.map((person) => person.id),
    ledger,
  );
  if ((balances.get(input.toUserId) ?? 0) <= 0) {
    throw new ExpenseError(400, "Esa persona no tiene saldo a favor.");
  }
  const pendingCents = pending.reduce((sum, payment) => sum + payment.amountCents, 0);
  const owedCents = -(balances.get(userId) ?? 0) - pendingCents;
  if (owedCents <= 0) {
    throw new ExpenseError(409, "No tienes deudas por pagar en este plan.");
  }
  if (input.amount > owedCents) {
    throw new ExpenseError(409, `No puedes pagar más de lo que debes (${formatBs(owedCents)}).`);
  }

  await prisma.planPayment.create({
    data: { planId, fromUserId: userId, toUserId: input.toUserId, amountCents: input.amount },
  });
  return getExpenses(userId, planId);
}

async function respondToPayment(
  userId: string,
  planId: string,
  paymentId: string,
  answer: { status: "confirmado" } | { status: "rechazado"; reason: string },
) {
  await requireParticipant(planId, userId);
  const payment = await prisma.planPayment.findFirst({ where: { id: paymentId, planId } });
  if (!payment) throw new ExpenseError(404, "Ese pago no está en el plan.");
  if (payment.toUserId !== userId) {
    throw new ExpenseError(403, "Solo quien recibe el pago puede confirmarlo o rechazarlo.");
  }

  // The status guard makes the transition atomic: a second answer updates nothing.
  const { count } = await prisma.planPayment.updateMany({
    where: { id: paymentId, status: "pendiente" },
    data: {
      status: answer.status,
      rejectReason: answer.status === "rechazado" ? answer.reason : null,
      resolvedAt: new Date(),
    },
  });
  if (count === 0) throw new ExpenseError(409, "Este pago ya fue confirmado o rechazado.");
  return getExpenses(userId, planId);
}

export function confirmPayment(userId: string, planId: string, paymentId: string) {
  return respondToPayment(userId, planId, paymentId, { status: "confirmado" });
}

export function rejectPayment(userId: string, planId: string, paymentId: string, reason: string) {
  return respondToPayment(userId, planId, paymentId, { status: "rechazado", reason });
}
