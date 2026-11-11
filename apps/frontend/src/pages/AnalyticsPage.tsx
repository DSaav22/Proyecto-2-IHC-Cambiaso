import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "../components/domain";
import { useAnalyticsSummary } from "../hooks/useAnalyticsSummary";

// {via: "boton"} instead of {"via":"boton"}, same as the class example.
function showProps(props: Record<string, string>) {
  const entries = Object.entries(props).map(([key, value]) => `${key}: "${value}"`);
  return `{${entries.join(", ")}}`;
}

function showDate(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AnalyticsPage() {
  const { summary, loading, error, reload } = useAnalyticsSummary();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Analítica (solo desarrollo)</h1>
          <p className="text-muted-foreground">
            ¿Cuántos empiezan a crear un plan y cuántos llegan a confirmarlo?
          </p>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void reload()}>
          <RotateCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          Actualizar
        </Button>
      </header>

      <ErrorAlert message={error} />

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-3xl font-extrabold">{summary.counts.plan_creacion_iniciada}</p>
              <p className="font-mono text-xs text-muted-foreground">plan_creacion_iniciada</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-3xl font-extrabold">{summary.counts.plan_confirmado}</p>
              <p className="font-mono text-xs text-muted-foreground">plan_confirmado</p>
            </div>
            <div className="rounded-xl border border-accent bg-accent/40 p-4">
              <p className="text-3xl font-extrabold">{summary.completionRate} %</p>
              <p className="text-xs text-muted-foreground">terminan</p>
            </div>
          </div>

          <div className="grid gap-2">
            <h2 className="text-base font-semibold">
              Tabla <code className="rounded bg-muted px-1.5 py-0.5 text-sm">eventos</code> (últimos
              10)
            </h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left font-mono text-sm">
                <thead className="bg-foreground text-background">
                  <tr>
                    <th className="px-4 py-2 font-semibold">evento</th>
                    <th className="px-4 py-2 font-semibold">props</th>
                    <th className="px-4 py-2 font-semibold">fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-sans text-muted-foreground">
                        Todavía no hay eventos.
                      </td>
                    </tr>
                  ) : (
                    summary.recent.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-2">{row.event}</td>
                        <td className="px-4 py-2">{showProps(row.props)}</td>
                        <td className="whitespace-nowrap px-4 py-2">{showDate(row.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
