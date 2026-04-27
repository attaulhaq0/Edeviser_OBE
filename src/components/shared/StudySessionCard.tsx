// =============================================================================
// StudySessionCard — Card showing session title, time, course, duration,
// status badge, and Start/Edit actions
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudySession } from "@/types/planner";
import { Clock, BookOpen, Play, Pencil } from "lucide-react";

interface StudySessionCardProps {
  session: StudySession;
  onStart?: (session: StudySession) => void;
  onEdit?: (session: StudySession) => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<
  StudySession["status"],
  { label: string; className: string }
> = {
  planned: { label: "Planned", className: "bg-blue-100 text-blue-700" },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

const StudySessionCard = ({
  session,
  onStart,
  onEdit,
  compact = false,
}: StudySessionCardProps) => {
  const statusConfig = STATUS_STYLES[session.status];
  const canStart = session.status === "planned";
  const canEdit = session.status === "planned";

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 transition-shadow hover:shadow-sm",
        compact && "p-2"
      )}
    >
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-1">
        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">
          {session.title}
        </h4>
        <Badge
          className={cn(
            "shrink-0 text-[10px] px-1.5 py-0",
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Time + Duration + Course */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.plannedStartTime}
        </span>
        <span className="flex items-center gap-1">
          {formatDuration(session.plannedDurationMinutes)}
        </span>
        {session.courseName && (
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span className="line-clamp-1">{session.courseName}</span>
          </span>
        )}
      </div>

      {/* Actions */}
      {(canStart || canEdit) && !compact && (
        <div className="mt-2 flex items-center gap-1.5">
          {canStart && onStart && (
            <Button
              size="sm"
              className="h-7 gap-1 bg-gradient-to-r from-teal-500 to-blue-600 text-[11px] active:scale-95"
              onClick={() => onStart(session)}
            >
              <Play className="h-3 w-3" />
              Start
            </Button>
          )}
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => onEdit(session)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudySessionCard;
export type { StudySessionCardProps };
