// =============================================================================
// SectionHeader — section heading with a gradient icon chip + optional action
// =============================================================================
//
// Presentation-only primitive introduced by the UI prototype migration
// (spec: .kiro/specs/ui-prototype-migration, design §3.2). Renders a section
// heading as a small brand-gradient icon CHIP + title (+ optional description)
// with an optional trailing action.
//
// This is DISTINCT from `GradientCardHeader`, which is a full-width gradient
// BAR placed at the top of a section card (white text on a gradient band).
// Use SectionHeader for in-page section titles; use GradientCardHeader for the
// colored header strip of a section card.
//
// RTL: uses logical `ms-auto` so the action sits at the inline-end in both LTR
// and RTL. Dark-mode aware (title/description use theme tokens).
// =============================================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Optional leading icon, shown inside the brand-gradient chip. */
  icon?: LucideIcon;
  /** Section title. */
  title: string;
  /** Optional supporting copy under the title. */
  description?: string;
  /** Optional trailing action(s), rendered at the inline-end. */
  action?: ReactNode;
  /** Heading level for the title. Default "h2". */
  as?: "h2" | "h3";
  className?: string;
}

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: SectionHeaderProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    {Icon && (
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
    )}
    <div className="min-w-0">
      <Heading className="text-lg font-bold tracking-tight text-foreground truncate">
        {title}
      </Heading>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action && <div className="ms-auto shrink-0">{action}</div>}
  </div>
);

export default SectionHeader;
