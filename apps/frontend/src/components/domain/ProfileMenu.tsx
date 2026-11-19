import { User } from "lucide-react";
import { Link } from "react-router-dom";

export function ProfileMenu({ name }: { name: string }) {
  return (
    <Link
      to="/mis-datos"
      className="flex min-h-11 items-center gap-2.5 rounded-lg px-1 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={`Mis datos de ${name}`}
    >
      {/* Icon only: letter initials are visible text that axe flags against aria-label. */}
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-secondary text-secondary-foreground"
      >
        <User className="size-4" aria-hidden="true" />
      </span>
      <span className="hidden max-w-40 truncate text-sm font-semibold md:inline" aria-hidden="true">
        {name}
      </span>
    </Link>
  );
}
