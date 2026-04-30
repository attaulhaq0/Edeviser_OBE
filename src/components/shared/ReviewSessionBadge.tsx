// =============================================================================
// ReviewSessionBadge — Badge showing spaced repetition review interval label
// ("Day 1 Review", "Day 3 Review", "Day 7 Review") with distinct color styling
// per interval and a status indicator (pending, completed, skipped).
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/planner";
import { CheckCircle2, SkipForward } from "lucide-react";

interface ReviewSessionBadgeProps {
  intervalDays: 1 | 3 | 7;
  status: ReviewStatus;
  className?: string;
}

const INTERVAL_CONFIG: Record<1 | 3 | 7, { label: string; className: string }> =
  {
    1: {
      label: "Day 1 Review",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    },
    3: {
      label: "Day 3 Review",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    7: {
      label: "Day 7 Review",
      className: "bg-green-100 text-green-700 border-green-200",
    },
  };

const ReviewSessionBadge = ({
  intervalDays,
  status,
  className,
}: ReviewSessionBadgeProps) => {
  const config = INTERVAL_CONFIG[intervalDays];
  const isSkipped = status === "skipped";
  const isCompleted = status === "completed";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold tracking-wide uppercase gap-1",
        config.className,
        isSkipped && "opacity-60 line-through",
        className
      )}
    >
      {isCompleted && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {isSkipped && <SkipForward className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </Badge>
  );
};

export default ReviewSessionBadge;
export { ReviewSessionBadge };
export type { ReviewSessionBadgeProps };
