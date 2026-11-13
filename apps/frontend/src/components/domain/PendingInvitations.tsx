import { CalendarDays } from "lucide-react";
import type { PlanInvitation } from "../../api/client";
import { Button } from "@/components/ui/button";
import { formatDueDate } from "../../lib/plans";

interface PendingInvitationsProps {
  invitations: PlanInvitation[];
  pending?: boolean;
  onAccept: (invitation: PlanInvitation) => void;
  onDecline: (invitation: PlanInvitation) => void;
}

export function PendingInvitations({ invitations, pending = false, onAccept, onDecline }: PendingInvitationsProps) {
  if (invitations.length === 0) return null;

  return (
    <section aria-labelledby="invitations-title" className="grid gap-3">
      <h2 id="invitations-title" className="text-xl font-bold">
        Invitaciones pendientes
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <article className="grid gap-3 rounded-xl border bg-card p-5 shadow-xs">
              <h3 className="wrap-break-word text-lg font-bold leading-snug">{invitation.plan.titulo}</h3>
              <p className="wrap-break-word text-sm text-muted-foreground">{invitation.plan.description}</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-4 text-primary" />
                {formatDueDate(invitation.plan.dueDate)}
              </p>
              <p className="text-sm">
                Organiza: <span className="font-semibold">{invitation.plan.ownerName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Si te unes, aparecerás como participante y podrán incluirte en los gastos del plan.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" disabled={pending} onClick={() => onAccept(invitation)}>
                  Unirme al plan
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => onDecline(invitation)}>
                  Rechazar
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
