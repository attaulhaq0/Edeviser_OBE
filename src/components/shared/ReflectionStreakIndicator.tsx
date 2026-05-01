// =============================================================================
// ReflectionStreakIndicator — Shows consecutive weeks with completed reflections
// =============================================================================

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReflectionStreakIndicatorProps {
  streakWeeks: number;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ReflectionStreakIndicator = ({
  streakWeeks,
  className,
}: ReflectionStreakIndicatorProps) => {
  if (streakWeeks <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200",
        className
      )}
      data-testid="reflection-streak-indicator"
      aria-label={`${streakWeeks} week reflection streak`}
    >
      <Flame className="h-4 w-4 text-orange-500 animate-streak-flame" />
      <span className="text-xs font-bold text-orange-700">
        {streakWeeks} week{streakWeeks !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

export default ReflectionStreakIndicator;
export type { ReflectionStreakIndicatorProps };
