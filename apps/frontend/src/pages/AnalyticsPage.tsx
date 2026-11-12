import { Fragment } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "../components/domain";
import { useAnalyticsSummary } from "../hooks/useAnalyticsSummary";
import { biggestDrop, ERROR_EVENTS, FUNNELS, funnelSteps } from "../lib/funnels";

// {via: "boton"} instead of {"via":"boton"}, same as the class example.
function showProps(props: Record<string, string | boolean>) {
  const entries = Object.entries(props).map(([key, value]) =>
    typeof value === "string" ? `${key}: "${value}"` : `${key}: ${value}`,
  );
  return `{${entries.join(", ")}}`;
}

function showDate(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AnalyticsPage() {
  const { summary, loading, error, reload } = useAnalyticsSummary();
  const worst = summary ? biggestDrop(FUNNELS, summary.counts) : null;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Analítica (solo desarrollo)</h1>
          <p className="text-muted-foreground">
            Un embudo por flujo: cuántos empiezan, cuántos llegan a cada paso y dónde se pierden.
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
          <p className="rounded-xl border border-accent bg-accent/40 px-4 py-3 text-sm">
            {worst ? (
              <>
                Mayor caída: <strong>{worst.flow}</strong>, de{" "}
                <code className="font-mono">{worst.from}</code> a{" "}
                <code className="font-mono">{worst.to}</code> se pierde el{" "}
                <strong>{worst.drop} %</strong>.
              </>
            ) : (
              "Todavía no hay caídas entre pasos."
            )}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {FUNNELS.map((funnel) => (
              <article key={funnel.flow} aria-label={`Embudo ${funnel.flow}`} className="rounded-xl border bg-card p-4">
                <h2 className="mb-3 font-semibold">{funnel.flow}</h2>
                <ol className="flex flex-wrap items-center gap-2">
                  {funnelSteps(funnel.steps, summary.counts).map((step) => (
                    <Fragment key={step.event}>
                      {step.drop !== null ? (
                        <li aria-hidden="true" className="text-xs font-semibold text-destructive">
                          −{step.drop} % →
                        </li>
                      ) : null}
                      <li className="rounded-lg bg-muted px-3 py-2">
                        <p className="text-xl font-extrabold">{step.count}</p>
                        <p className="font-mono text-xs text-muted-foreground">{step.event}</p>
                      </li>
                    </Fragment>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          <div className="grid gap-2">
            <h2 className="text-base font-semibold">Errores que frenan la tarea</h2>
            <ul className="grid gap-1 rounded-xl border bg-card p-4 font-mono text-sm">
              {ERROR_EVENTS.map((event) => (
                <li key={event}>
                  {event}: <strong>{summary.counts[event]}</strong>
                  {summary.reasons
                    .filter((row) => row.event === event)
                    .map((row) => ` · ${row.motivo} ${row.count}`)
                    .join("")}
                </li>
              ))}
            </ul>
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
