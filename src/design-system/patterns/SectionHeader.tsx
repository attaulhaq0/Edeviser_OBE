// =============================================================================
// SectionHeader — prototype `.sec-h` header (design system)
// =============================================================================
// A brand-gradient icon chip + title (+ optional description/action). Use inside
// a card body or standalone. RTL-safe (`ms-auto`), dark-mode aware.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Leading icon shown inside the brand-gradient chip. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Trailing action, inline-end aligned. */
  action?: ReactNode;
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
  <div className={cn("flex items-center gap-2", className)}>
    {Icon && (
      <span
        className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-[9px] border border-slate-200/80 bg-white/80 text-sky-700 backdrop-blur-xs shadow-none"
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    )}
    <div className="min-w-0">
      {/* Prototype `.sec-h h2`: 13px / 800 / .02em / slate-900. */}
      <Heading className="truncate text-[13px] font-extrabold tracking-[0.02em] text-slate-900">
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
