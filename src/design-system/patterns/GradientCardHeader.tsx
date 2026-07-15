// =============================================================================
// GradientCardHeader — section-card header strip (design system)
// =============================================================================
// A full-width card-top header: brand-gradient icon chip + title on a hairline
// bordered strip (prototype `.pcard` gradient header). Distinct from
// `SectionHeader` (the inline `.sec-h`). Internalized into the design system
// (P0.4/§A) so screens no longer depend on the legacy shared component.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface GradientCardHeaderProps {
  icon?: LucideIcon;
  title: string;
  className?: string;
  children?: ReactNode;
}

const GradientCardHeader = ({
  icon: Icon,
  title,
  className,
  children,
}: GradientCardHeaderProps) => (
  <div
    className={cn(
      "flex items-center gap-2 border-b border-[#eef2f6] px-6 py-4",
      className
    )}
  >
    {Icon && (
      // Prototype `.sec-h .chip`: 26px gradient chip, 9px radius, teal halo.
      <span
        className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[9px] text-white shadow-[0_3px_8px_rgba(20,184,166,0.25)]"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    )}
    <h2 className="truncate text-[13px] font-extrabold tracking-[0.02em] text-slate-900">
      {title}
    </h2>
    {children && <div className="ms-auto shrink-0">{children}</div>}
  </div>
);

export default GradientCardHeader;
