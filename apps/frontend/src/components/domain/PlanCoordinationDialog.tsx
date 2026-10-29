import { useState } from "react";
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

interface PlanCoordinationDialogProps {
  planId: string;
  planTitle: string;
  canInvite: boolean;
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
  canInvite,
  open,
  onOpenChange,
}: PlanCoordinationDialogProps) {
  const { board, loading, error, pending, invite, propose, vote } = usePlanCoordination(planId, open);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"fecha" | "lugar">("fecha");
  const [label, setLabel] = useState("");

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    const result = await invite(email);
    if (result.ok) setEmail("");
  }

  async function onPropose(event: React.FormEvent) {
    event.preventDefault();
    const result = await propose(kind, label);
    if (result.ok) setLabel("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechas y lugares</DialogTitle>
          <DialogDescription>
            En «{planTitle}» se puede invitar, proponer una fecha o un lugar y votar una opción. El voto
            queda guardado.
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
              {canInvite ? (
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

            <section className="grid gap-2">
              <h3 className="text-sm font-semibold">Propuestas</h3>
              <form onSubmit={onPropose} className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="option-kind">Tipo</Label>
                  <select
                    id="option-kind"
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value === "lugar" ? "lugar" : "fecha");
                      setLabel("");
                    }}
                    className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value="fecha">Fecha</option>
                    <option value="lugar">Lugar</option>
                  </select>
                </div>
                <div className="grid min-w-40 flex-1 gap-1">
                  <Label htmlFor="option-label">{kind === "fecha" ? "Fecha" : "Lugar"}</Label>
                  <Input
                    id="option-label"
                    type={kind === "fecha" ? "date" : "text"}
                    value={label}
                    placeholder={kind === "lugar" ? "Parque central" : undefined}
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" disabled={pending}>
                  Proponer
                </Button>
              </form>

              {board.options.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay propuestas.</p>
              ) : (
                <ul className="grid gap-2">
                  {board.options.map((option) => (
                    <li
                      key={option.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="text-sm">
                        <p className="font-medium">
                          {option.kind === "fecha" ? "Fecha" : "Lugar"}: {showOption(option.kind, option.label)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.authorName} · {option.votes} {option.votes === 1 ? "voto" : "votos"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={option.mine ? "secondary" : "outline"}
                        disabled={pending || option.mine}
                        onClick={() => void vote(option.id)}
                      >
                        {option.mine ? "Tu voto" : "Votar"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
