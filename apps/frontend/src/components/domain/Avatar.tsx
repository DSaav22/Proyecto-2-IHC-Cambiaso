import { cn } from "@/lib/utils";

interface AvatarProps {
  label: string;
  name: string;
  className?: string;
  /** When true, hides the avatar from the accessibility tree (e.g. inside a labelled link). */
  decorative?: boolean;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export function Avatar({ label, name, className, decorative = false }: AvatarProps) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full border bg-secondary text-xs font-bold text-secondary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
