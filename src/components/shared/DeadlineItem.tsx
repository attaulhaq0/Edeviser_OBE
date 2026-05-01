// =============================================================================
// DeadlineItem — Read-only deadline item with urgency color indicator
// (red/yellow/green), course name, due time
// =============================================================================

import { cn } from "@/lib/utils";
import type { UpcomingDeadline } from "@/types/planner";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DeadlineItemProps {
  deadline: UpcomingDeadline;
  compact?: boolean;
}

const URGENCY_STYLES: Record<
  UpcomingDeadline["urgency"],
  { border: string; bg: string; dot: string; icon: string }
> = {
  red: {
    border: "border-red-300",
    bg: "bg-red-50/60",
    dot: "bg-red-500",
    icon: "text-red-500",
  },
  yellow: {
    border: "border-amber-300",
    bg: "bg-amber-50/60",
    dot: "bg-amber-500",
    icon: "text-amber-500",
  },
  green: {
    border: "border-green-300",
    bg: "bg-green-50/60",
    dot: "bg-green-500",
    icon: "text-green-500",
  },
};

const DeadlineItem = ({ deadline, compact = false }: DeadlineItemProps) => {
  const urgencyConfig = URGENCY_STYLES[deadline.urgency];

  const formatDueDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, "MMM d, h:mm a");
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5",
        urgencyConfig.border,
        urgencyConfig.bg,
        compact && "p-2"
      )}
    >
      {/* Urgency dot */}
      <div className="mt-1 shrink-0">
        {deadline.urgency === "red" ? (
          <AlertTriangle className={cn("h-3.5 w-3.5", urgencyConfig.icon)} />
        ) : (
          <div className={cn("h-2.5 w-2.5 rounded-full", urgencyConfig.dot)} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">
          {deadline.title}
        </h4>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {formatDueDate(deadline.dueDate)}
          </span>
          {deadline.courseName && (
            <span className="line-clamp-1">{deadline.courseName}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeadlineItem;
export type { DeadlineItemProps };
