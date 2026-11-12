import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type ExpenseInput, type ExpensesBoard } from "../api/client";
import { track } from "../lib/analytics";

function expenseRejectReason(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return "plan_cancelado" as const;
  if (error instanceof ApiError && error.message.startsWith("Los montos suman")) {
    return "no_suma_total" as const;
  }
  return "dato_invalido" as const;
}

export function usePlanExpenses(planId: string, open: boolean) {
  const [board, setBoard] = useState<ExpensesBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await api.getExpenses(planId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los gastos.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  async function run(action: () => Promise<ExpensesBoard>, onError?: (err: unknown) => void) {
    setPending(true);
    setError(null);
    try {
      setBoard(await action());
      return { ok: true as const };
    } catch (err) {
      onError?.(err);
      const message = err instanceof ApiError ? err.message : "No se pudo guardar.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setPending(false);
    }
  }

  async function addExpense(input: ExpenseInput) {
    const result = await run(
      () => api.addExpense(planId, input),
      (err) => track("gasto_rechazado", { motivo: expenseRejectReason(err) }),
    );
    if (result.ok) track("gasto_registrado", { modo: input.splitMode });
    return result;
  }

  async function registerPayment(toUserId: string, amount: string) {
    const result = await run(() => api.registerPayment(planId, { toUserId, amount }));
    if (result.ok) track("pago_registrado", {});
    return result;
  }

  async function confirmPayment(paymentId: string) {
    const result = await run(() => api.confirmPayment(planId, paymentId));
    if (result.ok) track("pago_confirmado", {});
    return result;
  }

  return {
    board,
    loading,
    error,
    pending,
    addExpense,
    registerPayment,
    confirmPayment,
    rejectPayment: (paymentId: string, reason: string) =>
      run(() => api.rejectPayment(planId, paymentId, reason)),
  };
}
