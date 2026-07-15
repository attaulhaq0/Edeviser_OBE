// =============================================================================
// MasteryRing — SVG progress/mastery ring (design system, prototype `.ring-mini`)
// =============================================================================
// Circular progress ring for mastery / attainment / completion. `tone="auto"`
// colors by OBE attainment thresholds; `tone="brand"` uses the teal→blue brand
// gradient (prototype ring fill). Dark-mode aware, reduced-motion safe.
// Internalized into the design system (P0.4/§A) so screens no longer depend on
// the legacy shared component.
// =============================================================================

import * as React from "react";

import { cn } from "@/lib/utils";

export interface MasteryRingProps {
  /** Progress value, 0–100 (clamped and rounded). */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring stroke width in px. */
  strokeWidth?: number;
  /**
   * "auto" (default) colors the ring by attainment threshold; "brand" uses the
   * teal→blue brand gradient regardless of value.
   */
  tone?: "auto" | "brand";
  /** Show the numeric percentage in the center. Ignored when `children` is set. */
  showValue?: boolean;
  /** Accessible label; defaults to "<value>%". */
  label?: string;
  /** Optional custom center content (overrides `showValue`). */
  children?: React.ReactNode;
  className?: string;
}

/** Maps a value to its attainment-level stroke color (domain thresholds). */
const attainmentStroke = (v: number): string => {
  if (v >= 85) return "#22c55e"; // success — Excellent
  if (v >= 70) return "#3b82f6"; // brand blue — Satisfactory
  if (v >= 50) return "#f59e0b"; // warning — Developing
  return "#ef4444"; // destructive — Not Yet
};

const MasteryRing = ({
  value,
  size = 72,
  strokeWidth = 8,
  tone = "auto",
  showValue = true,
  label,
  children,
  className,
}: MasteryRingProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const gradientId = React.useId();
  const stroke =
    tone === "brand" ? `url(#${gradientId})` : attainmentStroke(clamped);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label ?? `${clamped}%`}
      >
        {tone === "brand" && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0382bd" />
            </linearGradient>
          </defs>
        )}
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : showValue ? (
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-foreground"
          aria-hidden="true"
        >
          {clamped}%
        </span>
      ) : null}
    </div>
  );
};

export default MasteryRing;
