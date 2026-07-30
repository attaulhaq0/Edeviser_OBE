// =============================================================================
// SeverityIcon — leading status icon in a tinted tile with a soft halo ring
// =============================================================================
//
// Presentation-only primitive introduced by the UI prototype migration
// (spec: .kiro/specs/ui-prototype-migration, design §3.2). Replaces the old
// colored "status spine" with a leading severity icon. Status is conveyed by
// color + icon, and callers MUST pair it with a text label/badge nearby — never
// rely on color alone (WCAG 1.4.1 / R10.3). When `label` is provided the tile is
// announced to assistive tech; otherwise it is decorative (aria-hidden).
//
// Tokens: uses the Tailwind palette that mirrors the design-system semantic
// hues (high=red/destructive, med=amber/warning, low=green/success, info=blue,
// brand=teal, neutral=slate). Dark-mode aware.
// =============================================================================

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const severityIconVariants = cva(
  "inline-flex items-center justify-center rounded-xl ring-4 shrink-0 [&>svg]:shrink-0",
  {
    variants: {
      severity: {
        high: "bg-red-50 text-red-600 ring-red-500/10 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-400/15",
        med: "bg-amber-50 text-amber-600 ring-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-400/15",
        low: "bg-green-50 text-green-600 ring-green-500/10 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-400/15",
        info: "bg-blue-50 text-blue-600 ring-blue-500/10 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-400/15",
        brand:
          "bg-teal-50 text-teal-600 ring-teal-500/10 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-400/15",
        neutral:
          "bg-slate-100 text-slate-600 ring-slate-400/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/15",
      },
      size: {
        sm: "size-8 [&>svg]:size-4",
        md: "size-10 [&>svg]:size-5",
        lg: "size-12 [&>svg]:size-6",
      },
    },
    defaultVariants: {
      severity: "brand",
      size: "md",
    },
  }
);

export interface SeverityIconProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof severityIconVariants> {
  /** The Lucide icon to render inside the tile. */
  icon: LucideIcon;
  /**
   * Accessible label. When provided, the tile is announced (role="img").
   * When omitted, the tile is treated as decorative (aria-hidden) — in that
   * case the surrounding UI MUST carry the status in text.
   */
  label?: string;
}

const SeverityIcon = ({
  icon: Icon,
  severity,
  size,
  label,
  className,
  ...props
}: SeverityIconProps) => (
  <span
    {...props}
    className={cn(severityIconVariants({ severity, size }), className)}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <Icon />
  </span>
);
SeverityIcon.displayName = "SeverityIcon";

// `severityIconVariants` is intentionally NOT exported: `src/components/shared`
// is linted with `react-refresh/only-export-components`, which forbids mixing a
// component export with a constant export. If the variants are needed elsewhere
// later, move them to a sibling `*.variants.ts` file and import from there.
export { SeverityIcon };
