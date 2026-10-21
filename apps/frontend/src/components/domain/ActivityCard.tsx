import { Ban, CalendarPlus, CircleCheck, Pencil, UserMinus, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { ActivityAction, ActivityEvent } from "../../api/client";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_ACTION_LABELS, formatExactTime, formatRelativeTime } from "../../lib/activity";
import { PLAN_STATUS_LABELS } from "../../lib/plans";

const ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  created: CalendarPlus,
  confirmed: CircleCheck,
  cancelled: Ban,
  edited: Pencil,
  joined: UserPlus,
  left: UserMinus,
};

const BADGE_VARIANTS = { pendiente: "muted", confirmado: "success", cancelado: "danger" } as const;

/**
 * One self-contained event: what happened, when, the resulting state and the plan involved,
 * so the user never has to cross-reference another screen.
 */
export function ActivityCard({ event, now }: { event: ActivityEvent; now?: Date }) {
  const Icon = ACTION_ICONS[event.action];
  const state = event.newState ?? event.planEstado;

  return (
    <article className="flex gap-4 rounded-xl border bg-card p-4 shadow-xs">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold">{ACTIVITY_ACTION_LABELS[event.action]}</h3>
          <Badge data-testid="activity-status-badge" variant={state ? BADGE_VARIANTS[state] : "outline"}>
            {state ? PLAN_STATUS_LABELS[state] : "Plan eliminado"}
          </Badge>
        </div>
        {event.planId ? (
          <Link
            to="/mis-planes"
            className="wrap-break-word w-fit font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {event.planTitle}
          </Link>
        ) : (
          <p className="wrap-break-word font-semibold">{event.planTitle}</p>
        )}
        <p className="text-sm text-muted-foreground">
          <time dateTime={event.createdAt} title={formatExactTime(event.createdAt)}>
            {formatRelativeTime(event.createdAt, now)}
          </time>
          <span aria-hidden="true"> · </span>
          <span>{formatExactTime(event.createdAt)}</span>
        </p>
      </div>
    </article>
  );
}
