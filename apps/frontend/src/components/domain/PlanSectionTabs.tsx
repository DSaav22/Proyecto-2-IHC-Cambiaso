import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PLAN_SECTION_LABELS, PLAN_SECTIONS, type PlanSection } from "../../lib/planSections";

interface PlanSectionTabsProps {
  section: PlanSection;
  counts: Record<PlanSection, number>;
  /** Query string (without "?") for each section, keeping the active filters. */
  searchFor: (section: PlanSection) => string;
}

export function PlanSectionTabs({ section, counts, searchFor }: PlanSectionTabsProps) {
  return (
    <nav aria-label="Secciones de Mis planes" className="border-b">
      <ul className="-mb-px m-0 flex list-none flex-wrap gap-1 p-0">
        {PLAN_SECTIONS.map((value) => {
          const active = value === section;
          const search = searchFor(value);
          return (
            <li key={value}>
              <Link
                to={{ search: search ? `?${search}` : "" }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {PLAN_SECTION_LABELS[value]}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[value]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
