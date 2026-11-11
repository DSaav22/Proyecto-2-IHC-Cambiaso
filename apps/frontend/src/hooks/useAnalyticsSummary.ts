import { useCallback, useEffect, useState } from "react";
import { ApiError, api, type AnalyticsSummary } from "../api/client";

/** Loads the event counts and funnel shown on the development analytics panel. */
export function useAnalyticsSummary() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getAnalyticsSummary());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la analítica.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, error, reload };
}
