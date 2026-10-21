import { useEffect, useState } from "react";
import { ApiError, api } from "../api/client";
import type { ActivityEvent, ActivityFilter } from "../api/client";

/** Loads the caller's activity for the selected thematic filter, aborting stale requests. */
export function useActivity(filter: ActivityFilter) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .getActivity(filter, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setActivities(data.activities);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "No se pudo cargar tu historial.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [filter]);

  return { activities, loading, error };
}
