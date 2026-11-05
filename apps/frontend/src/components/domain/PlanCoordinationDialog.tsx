import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlanCoordination } from "../../hooks/usePlanCoordination";
import { ConfirmDialog } from "./ConfirmDialog";
import { localToday } from "../../lib/plans";

interface PlanCoordinationDialogProps {
  planId: string;
  planTitle: string;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function showOption(kind: string, label: string) {
  if (kind !== "fecha" || !/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  const [year, month, day] = label.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PlanCoordinationDialog({
  planId,
  planTitle,
  isOwner,
  open,
  onOpenChange,
}: PlanCoordinationDialogProps) {
  const { board, loading, error, pending, invite, propose, vote, unvote, closeVoting } =
    usePlanCoordination(planId, open);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"fecha" | "lugar">("fecha");
  const [label, setLabel] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    const result = await invite(email);
    if (result.ok) setEmail("");
  }

  async function onPropose(event: React.FormEvent, proposalKind: "fecha" | "lugar") {
    event.preventDefault();
    const result = await propose(proposalKind, label);
    if (result.ok) setLabel("");
  }

  async function onCloseVoting() {
    setCloseError(null);
    const result = await closeVoting();
    if (result.ok) setConfirmCloseOpen(false);
    else setCloseError(result.message);
  }

  const votingClosed = board?.votingClosed ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechas y lugares</DialogTitle>
          <DialogDescription>
            En «{planTitle}» se puede invitar, proponer fechas o lugares y votar por todas las
            opciones que te sirvan. Puedes quitar tu voto mientras la votación siga abierta.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {loading && !board ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}

        {board ? (
          <div className="grid gap-5">
            <section className="grid gap-2">
              <h3 className="text-sm font-semibold">Participantes</h3>
              <ul className="grid gap-1 text-sm">
                {board.participants.map((person) => (
                  <li key={`${person.role}-${person.name}`}>
                    {person.name}{" "}
                    <span className="text-muted-foreground">({person.role})</span>
                  </li>
                ))}
              </ul>
              {isOwner ? (
                <form onSubmit={onInvite} className="mt-1 flex flex-wrap items-end gap-2">
                  <div className="grid min-w-48 flex-1 gap-1">
                    <Label htmlFor="invite-email">Invitar por correo</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      placeholder="usuario2@planazo.com"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={pending}>
                    Invitar
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Solo quien creó el plan puede invitar. Igual puedes proponer y votar.
                </p>
              )}
            </section>

            <section className="grid gap-4">
              <div>
                <h3 className="text-sm font-semibold">Opciones para coordinar</h3>
                <p className="text-xs text-muted-foreground">
                  Las fechas y los lugares se votan por separado.
                </p>
              </div>

              {votingClosed ? (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-sm font-medium"
                >
                  <Lock aria-hidden="true" className="size-4 shrink-0" />
                  La votación está cerrada.
                </p>
              ) : null}

              {(["fecha", "lugar"] as const).map((sectionKind) => {
                const sectionOptions = board.options.filter((option) => option.kind === sectionKind);
                const isDateSection = sectionKind === "fecha";
                const inputId = isDateSection ? "option-date" : "option-place";
                return (
                  <section key={sectionKind} className="grid gap-2 rounded-lg border border-border/70 p-3">
                    <div>
                      <h4 className="font-semibold">{isDateSection ? "Fechas" : "Lugares"}</h4>
                      <p className="text-xs text-muted-foreground">
                        {isDateSection
                          ? "Propón días desde hoy para que el grupo los vote."
                          : "Propón lugares para que el grupo los vote."}
                      </p>
                    </div>

                    {!votingClosed ? (
                      <form
                        onSubmit={(event) => {
                          setKind(sectionKind);
                          void onPropose(event, sectionKind);
                        }}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <div className="grid min-w-40 flex-1 gap-1">
                          <Label htmlFor={inputId}>{isDateSection ? "Fecha" : "Lugar"}</Label>
                          <Input
                            id={inputId}
                            type={isDateSection ? "date" : "text"}
                            min={isDateSection ? localToday() : undefined}
                            value={kind === sectionKind ? label : ""}
                            placeholder={!isDateSection ? "Parque central" : undefined}
                            onChange={(event) => {
                              setKind(sectionKind);
                              setLabel(event.target.value);
                            }}
                          />
                        </div>
                        <Button type="submit" size="sm" disabled={pending}>
                          Proponer
                        </Button>
                      </form>
                    ) : null}

                    {sectionOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay {isDateSection ? "fechas" : "lugares"} propuestos.
                      </p>
                    ) : (
                      <ul className="grid gap-2">
                        {sectionOptions.map((option) => {
                          const optionText = `${isDateSection ? "Fecha" : "Lugar"}: ${showOption(option.kind, option.label)}`;
                          return (
                            <li
                              key={option.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                            >
                              <div className="text-sm">
                                <p className="font-medium">{optionText}</p>
                                <p className="text-xs text-muted-foreground">
                                  {option.authorName} · {option.votes}{" "}
                                  {option.votes === 1 ? "voto" : "votos"}
                                  {option.mine ? " · Votaste esta opción" : ""}
                                </p>
                              </div>
                              {!votingClosed ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="min-h-11"
                                  variant={option.mine ? "secondary" : "outline"}
                                  aria-pressed={option.mine}
                                  aria-label={
                                    option.mine
                                      ? `Quitar voto de ${optionText}`
                                      : `Votar por ${optionText}`
                                  }
                                  disabled={pending}
                                  onClick={() =>
                                    void (option.mine ? unvote(option.id) : vote(option.id))
                                  }
                                >
                                  {option.mine ? "Quitar voto" : "Votar"}
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}

              {isOwner && !votingClosed ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={pending}
                    onClick={() => {
                      setCloseError(null);
                      setConfirmCloseOpen(true);
                    }}
                  >
                    <Lock aria-hidden="true" />
                    Cerrar votación
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmCloseOpen}
          onOpenChange={(next) => {
            if (!pending) setConfirmCloseOpen(next);
          }}
          title="¿Cerrar la votación?"
          description="Nadie podrá votar, quitar votos ni proponer opciones nuevas. Esta acción no se puede deshacer."
          confirmLabel="Cerrar votación"
          pendingLabel="Cerrando…"
          pending={pending}
          error={closeError}
          onConfirm={() => void onCloseVoting()}
        />
      </DialogContent>
    </Dialog>
  );
}
