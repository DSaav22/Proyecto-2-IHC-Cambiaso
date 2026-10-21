import { useState } from "react";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import type { ActivityFilter } from "../api/client";
import { ActivityCard, ErrorAlert } from "../components/domain";
import { cn } from "@/lib/utils";
import { useActivity } from "../hooks/useActivity";
import { ACTIVITY_FILTER_LABELS } from "../lib/activity";

// Hick's law: a fixed set of 4 thematic chips instead of free-form filtering.
const FILTERS: ActivityFilter[] = ["todos", "estados", "creaciones", "participacion"];

export default function ActivityHistoryPage() {
  const [filter, setFilter] = useState<ActivityFilter>("todos");
  const { activities, loading, error } = useActivity(filter);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">Qué pasó en tus planes, cuándo y con qué resultado.</p>
      </header>

      <div role="group" aria-label="Filtrar actividad" className="flex flex-wrap gap-2">
        {FILTERS.map((value) => {
          const active = value === filter;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(value)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted",
              )}
            >
              {ACTIVITY_FILTER_LABELS[value]}
            </button>
          );
        })}
      </div>

      <ErrorAlert message={error} />

      {loading ? (
        <p role="status" className="text-muted-foreground">
          Cargando historial…
        </p>
      ) : activities.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card p-10 text-center">
          <History aria-hidden="true" className="size-10 text-muted-foreground" />
          <p className="text-lg font-semibold">Todavía no tenés actividad registrada</p>
          <Link
            to="/mis-planes"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Crear un plan
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {activities.map((event) => (
            <li key={event.id}>
              <ActivityCard event={event} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
