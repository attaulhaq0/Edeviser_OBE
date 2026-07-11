// =============================================================================
// GradientCardHeader — Reusable header for section cards
// =============================================================================
//
// Shared section-card header: a brand-gradient icon CHIP + dark title on a
// bordered strip, so every section card across the app coheres with the
// redesigned dashboards. Callers are unchanged (`icon` + `title` [+ optional
// `children`]).
//
// NOTE: the callers wrap this in cards hardcoded to `bg-white` (light surface in
// both themes), so the title uses a fixed dark color + light border (not theme
// tokens) to stay readable regardless of the active theme.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientCardHeaderProps {
  icon?: LucideIcon;
  title: string;
  className?: string;
  children?: React.ReactNode;
}

const GradientCardHeader = ({
  icon: Icon,
  title,
  className,
  children,
}: GradientCardHeaderProps) => {
  // Brand-gradient icon chip + dark title on a bordered white strip
  // (matches the redesigned dashboards' section-header look).
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-slate-100 px-6 py-4",
        className
      )}
    >
      {Icon && (
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ background: "var(--brand-gradient)" }}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <h2 className="truncate text-lg font-bold tracking-tight text-gray-900">
        {title}
      </h2>
      {children && <div className="ms-auto shrink-0">{children}</div>}
    </div>
  );
};

export default GradientCardHeader;
export type { GradientCardHeaderProps };
