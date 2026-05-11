// =============================================================================
// AttainmentBar — Shows attainment percentage with color coding
// Excellent ≥85% green, Satisfactory 70-84% blue, Developing 50-69% yellow, Not Yet <50% red
// =============================================================================
/* eslint-disable react-refresh/only-export-components */

import { cn } from "@/lib/utils";
import type { AttainmentLevel } from "@/types/app";

interface AttainmentBarProps {
  percent: number;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

const ATTAINMENT_STYLES: Record<
  AttainmentLevel,
  { bar: string; bg: string; text: string; label: string }
> = {
  Excellent: {
    bar: "bg-green-600",
    bg: "bg-green-50",
    text: "text-green-600",
    label: "Excellent",
  },
  Satisfactory: {
    bar: "bg-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    label: "Satisfactory",
  },
  Developing: {
    bar: "bg-yellow-600",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    label: "Developing",
  },
  Not_Yet: {
    bar: "bg-red-600",
    bg: "bg-red-50",
    text: "text-red-600",
    label: "Not Yet",
  },
};

function getAttainmentLevel(percent: number): AttainmentLevel {
  if (percent >= 85) return "Excellent";
  if (percent >= 70) return "Satisfactory";
  if (percent >= 50) return "Developing";
  return "Not_Yet";
}

const AttainmentBar = ({
  percent,
  label,
  className,
  showLabel = true,
}: AttainmentBarProps) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const level = getAttainmentLevel(clamped);
  const style = ATTAINMENT_STYLES[level];

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        {label && <span className="text-sm font-medium truncate">{label}</span>}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tabular-nums">
            {Math.round(clamped)}%
          </span>
          {showLabel && (
            <span className={cn("text-xs font-semibold", style.text)}>
              {style.label}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn("h-2.5 w-full rounded-full overflow-hidden", style.bg)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            style.bar
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default AttainmentBar;
export { getAttainmentLevel, ATTAINMENT_STYLES };
export type { AttainmentBarProps };
