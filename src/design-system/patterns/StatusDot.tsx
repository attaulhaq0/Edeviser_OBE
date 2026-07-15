// =============================================================================
// StatusDot — semantic status dot (design system)
// =============================================================================
// A small colored dot encoding status (PARITY.md §B.4). Decorative by default;
// pass `label` to expose an accessible name.
// =============================================================================

import { cn } from "@/lib/utils";

export type DotTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<DotTone, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-slate-300",
};

export interface StatusDotProps {
  tone: DotTone;
  /** Accessible label; when omitted the dot is decorative (aria-hidden). */
  label?: string;
  className?: string;
}

const StatusDot = ({ tone, label, className }: StatusDotProps) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={cn(
      // Prototype `.dot`: 8px round semantic status dot.
      "inline-block h-2 w-2 shrink-0 rounded-full",
      TONE_CLASS[tone],
      className
    )}
  />
);

export default StatusDot;
