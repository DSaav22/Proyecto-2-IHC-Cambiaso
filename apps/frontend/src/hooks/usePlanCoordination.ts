import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type CoordinationBoard } from "../api/client";

export function usePlanCoordination(planId: string, open: boolean) {
  const [board, setBoard] = useState<CoordinationBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await api.getCoordination(planId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  async function run(action: () => Promise<CoordinationBoard>) {
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
    invite: (email: string) => run(() => api.inviteToPlan(planId, email)),
    propose: (kind: "fecha" | "lugar", label: string) =>
      run(() => api.addPlanOption(planId, kind, label)),
    vote: (optionId: string) => run(() => api.votePlanOption(planId, optionId)),
  };
}
