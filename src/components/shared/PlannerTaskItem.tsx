// =============================================================================
// PlannerTaskItem — Task item with checkbox, title, priority badge,
// course tag, edit/delete actions
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PlannerTask } from "@/types/planner";
import { Pencil, Trash2 } from "lucide-react";

interface PlannerTaskItemProps {
  task: PlannerTask;
  onToggle?: (task: PlannerTask) => void;
  onEdit?: (task: PlannerTask) => void;
  onDelete?: (task: PlannerTask) => void;
  compact?: boolean;
}

const PRIORITY_STYLES: Record<
  PlannerTask["priority"],
  { label: string; className: string }
> = {
  high: { label: "High", className: "bg-red-100 text-red-700" },
  medium: { label: "Med", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low", className: "bg-gray-100 text-gray-600" },
};

const PlannerTaskItem = ({
  task,
  onToggle,
  onEdit,
  onDelete,
  compact = false,
}: PlannerTaskItemProps) => {
  const isCompleted = task.status === "completed";
  const priorityConfig = PRIORITY_STYLES[task.priority];

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 transition-shadow hover:shadow-sm",
        isCompleted && "opacity-60",
        compact && "p-2"
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={isCompleted}
          disabled={isCompleted}
          onCheckedChange={() => onToggle?.(task)}
          className="min-h-[20px] min-w-[20px]"
          aria-label={`Mark "${task.title}" as ${
            isCompleted ? "incomplete" : "complete"
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <span
            className={cn(
              "text-xs font-medium text-gray-900 line-clamp-1",
              isCompleted && "line-through text-gray-500"
            )}
          >
            {task.title}
          </span>
          <Badge
            className={cn(
              "shrink-0 text-[10px] px-1.5 py-0",
              priorityConfig.className
            )}
          >
            {priorityConfig.label}
          </Badge>
        </div>

        {task.courseName && (
          <span className="mt-0.5 block text-[11px] text-gray-500 line-clamp-1">
            {task.courseName}
          </span>
        )}
      </div>

      {/* Actions — visible on hover */}
      {!isCompleted && !compact && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onEdit(task)}
              aria-label={`Edit "${task.title}"`}
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onDelete(task)}
              aria-label={`Delete "${task.title}"`}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlannerTaskItem;
export type { PlannerTaskItemProps };
