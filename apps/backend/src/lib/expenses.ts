import { z } from "zod";

export type SplitMode = "igual" | "personalizado";
export type PaymentStatus = "pendiente" | "confirmado" | "rechazado";

export interface Share {
  userId: string;
  amountCents: number;
}

const MAX_AMOUNT_CENTS = 100_000_000;

/** Bs amount from the client ("120,50", "120.5" or 120.5) to integer cents. */
const amountSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const text = String(value).trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      ctx.addIssue({ code: "custom", message: "Escribe un monto válido, con hasta 2 decimales." });
      return z.NEVER;
    }
    const cents = Math.round(Number(text) * 100);
    if (cents <= 0) {
      ctx.addIssue({ code: "custom", message: "El monto debe ser mayor que cero." });
      return z.NEVER;
    }
    if (cents > MAX_AMOUNT_CENTS) {
      ctx.addIssue({ code: "custom", message: "El monto es demasiado grande." });
      return z.NEVER;
    }
    return cents;
  });

export const expenseInputSchema = z.object({
  description: z
    .string({ error: "Describe el gasto." })
    .trim()
    .min(1, "Describe el gasto.")
    .max(120, "Usa 120 caracteres o menos."),
  amount: amountSchema,
  paidById: z.string({ error: "Elige quién pagó." }).min(1, "Elige quién pagó."),
  splitMode: z.enum(["igual", "personalizado"], { error: "Elige cómo se divide." }),
  participantIds: z.array(z.string()).optional(),
  shares: z.array(z.object({ userId: z.string(), amount: amountSchema })).optional(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const paymentInputSchema = z.object({
  toUserId: z.string({ error: "Elige a quién le pagas." }).min(1, "Elige a quién le pagas."),
  amount: amountSchema,
});

export const rejectInputSchema = z.object({
  reason: z
    .string({ error: "Escribe el motivo del rechazo." })
    .trim()
    .min(1, "Escribe el motivo del rechazo.")
    .max(200, "Usa 200 caracteres o menos."),
});

/** Equal split; leftover cents go one each to the first people in the given order. */
export function splitEqually(totalCents: number, userIds: string[]): Share[] {
  const base = Math.floor(totalCents / userIds.length);
  const remainder = totalCents - base * userIds.length;
  return userIds.map((userId, index) => ({
    userId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

export type SharesResult = { ok: true; shares: Share[] } | { ok: false; message: string };

/** Builds the shares of an expense and checks they only involve plan participants. */
export function buildShares(input: ExpenseInput, participantIds: string[]): SharesResult {
  const allowed = new Set(participantIds);

  if (input.splitMode === "igual") {
    const ids = [...new Set(input.participantIds ?? [])];
    if (ids.length === 0) return { ok: false, message: "Elige al menos un participante." };
    if (ids.some((id) => !allowed.has(id))) {
      return { ok: false, message: "Solo se puede dividir entre participantes del plan." };
    }
    return { ok: true, shares: splitEqually(input.amount, ids) };
  }

  const shares = (input.shares ?? [])
    .filter((share) => share.amount > 0)
    .map((share) => ({ userId: share.userId, amountCents: share.amount }));
  if (shares.length === 0) return { ok: false, message: "Escribe cuánto le toca a cada persona." };
  if (new Set(shares.map((share) => share.userId)).size !== shares.length) {
    return { ok: false, message: "Cada persona puede aparecer una sola vez." };
  }
  if (shares.some((share) => !allowed.has(share.userId))) {
    return { ok: false, message: "Solo se puede dividir entre participantes del plan." };
  }
  const sum = shares.reduce((total, share) => total + share.amountCents, 0);
  if (sum !== input.amount) {
    return {
      ok: false,
      message: `Los montos suman ${formatBs(sum)} y el gasto es de ${formatBs(input.amount)}.`,
    };
  }
  return { ok: true, shares };
}

interface ExpenseForBalance {
  paidById: string;
  amountCents: number;
  shares: Share[];
}

interface PaymentForBalance {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  status: string;
}

/**
 * Net balance per participant in cents: positive means the group owes them,
 * negative means they owe. Only confirmed payments move the balance.
 */
export function computeBalances(
  participantIds: string[],
  expenses: ExpenseForBalance[],
  payments: PaymentForBalance[],
): Map<string, number> {
  const balances = new Map(participantIds.map((id) => [id, 0]));
  const add = (userId: string, cents: number) =>
    balances.set(userId, (balances.get(userId) ?? 0) + cents);

  for (const expense of expenses) {
    add(expense.paidById, expense.amountCents);
    for (const share of expense.shares) add(share.userId, -share.amountCents);
  }
  for (const payment of payments) {
    if (payment.status !== "confirmado") continue;
    add(payment.fromUserId, payment.amountCents);
    add(payment.toUserId, -payment.amountCents);
  }
  return balances;
}

export function formatBs(cents: number): string {
  return `Bs ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
