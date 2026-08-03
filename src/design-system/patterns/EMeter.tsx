// =============================================================================
// EMeter — semantic threshold meter (L2 pattern)
// =============================================================================
//
// Pixel-faithful React reproduction of the prototype `.emeter` (prototype/
// shared.css) — see src/design-system/PARITY.md §A.4. The fill color encodes
// status against thresholds, like the native HTML <meter>; the default fill is
// the 93.65deg brand gradient (student) or flat slate (`pro`, institution).
//
// This is DISTINCT from `@/components/shared/AttainmentBar`, which is the
// attainment-LEVEL bar (Excellent/Satisfactory/Developing/Not-Yet, labeled,
// solid colors, 85/70/50 thresholds). EMeter is the generic prototype meter:
//   - default (no variant) → positive-progress gradient fill (student)
//   - strong/good/attention/critical → status-by-color
//   - pro → flat, muted, inset professional variant (institution side)
//
// Reduced-motion safe; renders role="meter" with aria-valuenow/min/max.
//
// The pure helpers (clampPercent / emeterFillBackground) are exported alongside
// the component for isolated unit + property testing — matching the established
// AttainmentBar.tsx pattern, hence the same targeted lint exception.
// =============================================================================
/* eslint-disable react-refresh/only-export-components */

import { cn } from "@/lib/utils";

/** Semantic status modifiers (fill color encodes status). */
export type EMeterVariant = "strong" | "good" | "attention" | "critical";

/**
 * Exact fill backgrounds reproduced verbatim from prototype/shared.css `.emeter`.
 * - `default` = student/brand-forward (base = 93.65deg brand gradient).
 * - `pro`     = institution flat/muted professional variant (`.emeter.pro`).
 */
export const EMETER_FILL = {
  default: {
    base: "var(--brand-gradient)",
    strong: "#16a34a",
    good: "#0d9488",
    attention: "#f59e0b",
    critical: "#ef4444",
  },
  pro: {
    base: "#334155",
    strong: "#15803d",
    good: "#0f766e",
    attention: "#b45309",
    critical: "#b91c1c",
  },
} as const;

/**
 * Clamp a raw percentage into the meter's [0,100] domain. Non-finite inputs
 * (NaN / ±Infinity) collapse to 0 — a meter cannot render an undefined or
 * infinite width, and 0 is the safe, non-misleading default.
 */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * Resolve the exact fill `background` for a variant (+ `pro`), matching the
 * prototype `.emeter` rules. An omitted variant returns the default fill
 * (brand gradient for student, flat slate for `pro`).
 */
export function emeterFillBackground(
  variant?: EMeterVariant,
  pro = false
): string {
  const set = pro ? EMETER_FILL.pro : EMETER_FILL.default;
  return variant ? set[variant] : set.base;
}

export interface EMeterProps {
  /** Progress/attainment percentage; clamped to [0,100]. */
  value: number;
  /**
   * Semantic status. Omit for the default positive-progress fill (student =
   * brand gradient, institution = flat slate when `pro`).
   */
  variant?: EMeterVariant;
  /** Institution/professional flat variant (`.emeter.pro`). */
  pro?: boolean;
  /** Accessible name for the meter (sets `aria-label`). */
  label?: string;
  className?: string;
}

const EMeter = ({
  value,
  variant,
  pro = false,
  label,
  className,
}: EMeterProps) => {
  const pct = clampPercent(value);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full overflow-hidden rounded-full bg-[#eef2f6]",
        pro ? "h-2.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]" : "h-2",
        className
      )}
    >
      <span
        className="block h-full rounded-[inherit] transition-[width] duration-500 motion-reduce:transition-none"
        style={{
          width: `${pct}%`,
          background: emeterFillBackground(variant, pro),
        }}
      />
    </div>
  );
};

export default EMeter;
