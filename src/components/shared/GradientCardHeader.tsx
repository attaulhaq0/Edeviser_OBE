// =============================================================================
// GradientCardHeader — Reusable header for section cards
// =============================================================================
//
// Shared section-card header. Flag-aware (spec: ui-prototype-migration, §3.2 +
// task 0.3): with `newUiModules` ON (the default), it renders the redesigned
// look — a brand-gradient icon CHIP + dark title on a bordered strip — so every
// section card across the app coheres with the redesigned dashboards. With the
// flag OFF it renders the original full-width brand-gradient BAR (white text),
// byte-identical to before.
//
// Restyling here (one shared component) migrates all section cards at once
// instead of per-screen wrappers — the intended "shared-primitive" cohesion
// pass. Callers are unchanged (`icon` + `title` [+ optional `children`]).
//
// NOTE: the callers wrap this in cards hardcoded to `bg-white` (light surface in
// both themes), so the new-look title uses a fixed dark color + light border
// (not theme tokens) to stay readable regardless of the active theme.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

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
  const newModules = useFeatureFlag("newUiModules");

  // New design: brand-gradient icon chip + dark title on a bordered white strip
  // (matches the redesigned dashboards' section-header look).
  if (newModules) {
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
  }

  // Legacy: full-width brand-gradient bar with white text.
  return (
    <div
      className={cn("px-6 py-4 flex items-center gap-2", className)}
      style={{
        background: "var(--brand-gradient)",
      }}
    >
      {Icon && <Icon className="h-5 w-5 text-white" />}
      <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
};

export default GradientCardHeader;
export type { GradientCardHeaderProps };
