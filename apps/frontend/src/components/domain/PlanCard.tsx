import { useState } from "react";
import {
  Ban,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Copy,
  EllipsisVertical,
  Eye,
  Info,
  LogOut,
  Pencil,
  Trash2,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { Plan } from "../../api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDueDate, getDueStatus, PLAN_STATUS_LABELS } from "../../lib/plans";
import type { DueTone } from "../../lib/plans";
import { ConfirmDialog } from "./ConfirmDialog";

const toneStyles: Record<DueTone, { badge: "danger" | "warning" | "default" | "muted"; bar: string }> = {
  overdue: { badge: "danger", bar: "bg-destructive" },
  today: { badge: "warning", bar: "bg-accent" },
  soon: { badge: "warning", bar: "bg-accent" },
  later: { badge: "default", bar: "bg-primary" },
};

/** Outcome of a card action; a failure keeps its dialog open with the message. */
export type PlanActionResult = { ok: true } | { ok: false; message: string };

interface PlanCardProps {
  plan: Plan;
  onEdit?: (plan: Plan) => void;
  onConfirm?: (id: string) => Promise<PlanActionResult>;
  onCancel?: (id: string) => Promise<PlanActionResult>;
  onDelete?: (id: string) => Promise<PlanActionResult>;
  onLeave?: (id: string) => Promise<PlanActionResult>;
}

type OpenDialog = "confirm" | "cancel" | "delete" | "leave" | null;

export function PlanCard({ plan, onEdit, onConfirm, onCancel, onDelete, onLeave }: PlanCardProps) {
  const dueStatus = getDueStatus(plan.dueDate);
  const tone = toneStyles[dueStatus.tone];
  const isConfirmed = plan.estado === "confirmado";
  const isCancelled = plan.estado === "cancelado";
  const isPending = plan.estado === "pendiente";
  const isOwner = plan.isOwner ?? true;

  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function changeDialog(next: OpenDialog) {
    setActionError(null);
    setOpenDialog(next);
  }

  async function run(action?: (id: string) => Promise<PlanActionResult>) {
    setPending(true);
    setActionError(null);
    try {
      const result = await action?.(plan.id);
      if (result && !result.ok) {
        setActionError(result.message);
        return;
      }
      setOpenDialog(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <article
      className={cn(
        "relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 pl-6 shadow-xs transition-shadow hover:shadow-sm",
        isCancelled && "border-border/80 bg-muted/20 opacity-75",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1.5", isCancelled ? "bg-muted-foreground/30" : tone.bar)}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            data-testid="plan-status-badge"
            data-status={plan.estado}
            variant={isConfirmed ? "success" : isCancelled ? "muted" : "muted"}
          >
            {isConfirmed ? (
              <CircleCheck aria-hidden="true" />
            ) : isCancelled ? (
              <Ban aria-hidden="true" />
            ) : null}
            {PLAN_STATUS_LABELS[plan.estado]}
          </Badge>
          {!isOwner ? (
            <Badge variant="outline" data-testid="guest-badge" className="text-xs">
              Invitado
            </Badge>
          ) : null}
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Más acciones"
              className="-mr-2 -mt-2 size-11 p-0 text-muted-foreground"
            >
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-40 rounded-lg border bg-card p-1 shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
            >
              {isOwner ? (
                <>
                  {!isCancelled ? (
                    <DropdownMenu.Item
                      onSelect={() => onEdit?.(plan)}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-semibold text-foreground outline-none data-highlighted:bg-accent/10"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      Editar
                    </DropdownMenu.Item>
                  ) : null}
                  <DropdownMenu.Item
                    disabled={isConfirmed}
                    onSelect={() => {
                      if (!isConfirmed) changeDialog("delete");
                    }}
                    title={isConfirmed ? "Debes cancelar el plan antes de eliminarlo" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold outline-none",
                      isConfirmed
                        ? "cursor-not-allowed text-muted-foreground opacity-50"
                        : "cursor-pointer text-destructive data-highlighted:bg-destructive/10",
                    )}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Eliminar
                  </DropdownMenu.Item>
                  {isConfirmed ? (
                    <div
                      role="note"
                      className="border-t mt-1 px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      Debes cancelar el plan antes de eliminarlo
                    </div>
                  ) : null}
                </>
              ) : (
                <DropdownMenu.Item
                  onSelect={() => changeDialog("leave")}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-semibold text-destructive outline-none data-highlighted:bg-destructive/10"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Abandonar plan
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <h3 className={cn("wrap-break-word text-lg font-bold leading-snug", isCancelled && "text-muted-foreground")}>
        {plan.titulo}
      </h3>
      <p className={cn("wrap-break-word text-sm text-muted-foreground leading-relaxed", isCancelled && "opacity-75")}>
        {plan.description}
      </p>

      {isOwner && plan.shareCode ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Código: <strong className="font-mono font-medium text-foreground select-all">{plan.shareCode}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(plan.shareCode!);
              }
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            aria-label="Copiar código"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none"
          >
            {copied ? (
              <Check aria-hidden="true" className="size-3.5 text-success" />
            ) : (
              <Copy aria-hidden="true" className="size-3.5" />
            )}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      ) : !isOwner ? (
        <p className="text-xs text-muted-foreground">
          Creado por: <span className="font-semibold text-foreground">{plan.ownerName || "Organizador"}</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className={cn("size-4", isCancelled ? "text-muted-foreground" : "text-primary")} />
            <time dateTime={plan.dueDate} className={cn(isCancelled && "text-muted-foreground")}>
              {formatDueDate(plan.dueDate)}
            </time>
          </p>
          {!isCancelled ? (
            <Badge variant={tone.badge} className="text-xs">
              <Clock aria-hidden="true" />
              {dueStatus.label}
            </Badge>
          ) : null}
        </div>

        {isOwner ? (
          isPending ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => changeDialog("confirm")}>
                Confirmar plan
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => changeDialog("cancel")}>
                Cancelar plan
              </Button>
            </div>
          ) : isConfirmed ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => changeDialog("cancel")}>
                Cancelar plan
              </Button>
            </div>
          ) : (
            <div
              role="note"
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground"
            >
              <Info aria-hidden="true" className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span>
                Este plan está cancelado: no se puede editar ni confirmar. Puedes eliminarlo desde «Más
                acciones».
              </span>
            </div>
          )
        ) : (
          <div
            role="note"
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground"
          >
            <Eye aria-hidden="true" className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span>Solo lectura: solo el creador puede editar, confirmar o cancelar este plan.</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={openDialog === "confirm"}
        onOpenChange={(open) => {
          if (!pending) changeDialog(open ? "confirm" : null);
        }}
        title="¿Confirmar este plan?"
        description={`«${plan.titulo || plan.description}» pasará a Confirmado y ya no podrá volver a pendiente.`}
        confirmLabel="Confirmar"
        pendingLabel="Confirmando…"
        pending={pending}
        error={actionError}
        onConfirm={() => void run(onConfirm)}
      />
      <ConfirmDialog
        open={openDialog === "cancel"}
        onOpenChange={(open) => {
          if (!pending) changeDialog(open ? "cancel" : null);
        }}
        title="¿Cancelar este plan?"
        description={`«${plan.titulo || plan.description}» pasará a Cancelado. Podrás eliminarlo una vez cancelado.`}
        cancelLabel="Mantener plan"
        confirmLabel="Sí, cancelar plan"
        pendingLabel="Cancelando…"
        pending={pending}
        error={actionError}
        destructive
        onConfirm={() => void run(onCancel)}
      />
      <ConfirmDialog
        open={openDialog === "delete"}
        onOpenChange={(open) => {
          if (!pending) changeDialog(open ? "delete" : null);
        }}
        title="¿Eliminar este plan?"
        description={`«${plan.titulo || plan.description}» se eliminará de forma permanente.`}
        confirmLabel="Eliminar"
        pendingLabel="Eliminando…"
        pending={pending}
        error={actionError}
        destructive
        onConfirm={() => void run(onDelete)}
      />
      <ConfirmDialog
        open={openDialog === "leave"}
        onOpenChange={(open) => {
          if (!pending) changeDialog(open ? "leave" : null);
        }}
        title="¿Abandonar este plan?"
        description={`«${plan.titulo || plan.description}» desaparecerá de tu lista. Podrás volver a unirte con el código de compartir.`}
        confirmLabel="Abandonar"
        pendingLabel="Abandonando…"
        pending={pending}
        error={actionError}
        destructive
        onConfirm={() => void run(onLeave)}
      />
    </article>
  );
}
