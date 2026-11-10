import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type ExpenseInput, type ExpensesBoard } from "../api/client";

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

  async function run(action: () => Promise<ExpensesBoard>) {
    setPending(true);
    setError(null);
    try {
      setBoard(await action());
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo guardar.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setPending(false);
    }
  }

  return {
    board,
    loading,
    error,
    pending,
    addExpense: (input: ExpenseInput) => run(() => api.addExpense(planId, input)),
    registerPayment: (toUserId: string, amount: string) =>
      run(() => api.registerPayment(planId, { toUserId, amount })),
    confirmPayment: (paymentId: string) => run(() => api.confirmPayment(planId, paymentId)),
    rejectPayment: (paymentId: string, reason: string) =>
      run(() => api.rejectPayment(planId, paymentId, reason)),
  };
}
