// =============================================================================
// IndependenceScoreBadge — Color-coded independence score chip
// =============================================================================

import { cn } from "@/lib/utils";

interface IndependenceScoreBadgeProps {
  /** Independence score between 0 and 1 */
  score: number;
  /** Badge size variant */
  size?: "sm" | "md";
}

/**
 * Small badge/chip showing independence score as percentage.
 * Color-coded: green (≥70%), yellow (40–69%), red (<40%)
 */
const IndependenceScoreBadge = ({
  score,
  size = "sm",
}: IndependenceScoreBadgeProps) => {
  const percentage = Math.round(score * 100);

  const colorClasses =
    percentage >= 70
      ? "bg-green-50 text-green-700 border-green-200"
      : percentage >= 40
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-red-50 text-red-700 border-red-200";

  const sizeClasses =
    size === "md" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap",
        colorClasses,
        sizeClasses
      )}
      title={`Independence: ${percentage}% (${
        percentage >= 70 ? "High" : percentage >= 40 ? "Moderate" : "Low"
      })`}
      aria-label={`Independence score: ${percentage}%`}
    >
      {percentage}% ind.
    </span>
  );
};

export default IndependenceScoreBadge;
export type { IndependenceScoreBadgeProps };
