import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, BookOpen } from 'lucide-react';
import type { PlannerTask } from '@/types/planner';

interface PlannerTaskItemProps {
  task: PlannerTask;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-500 border-gray-200',
};

const PlannerTaskItem = ({ task, onToggle, onEdit, onDelete, readOnly = false }: PlannerTaskItemProps) => {
  const isCompleted = task.status === 'completed';

  return (
    <div className="flex items-start gap-2 py-1.5">
      {!readOnly && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggle?.()}
          disabled={isCompleted}
          className="mt-0.5"
          aria-label={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
        />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isCompleted && 'line-through text-gray-400',
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="outline"
            className={cn('text-[10px]', priorityStyles[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.courseName && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <BookOpen className="h-3 w-3" />
              {task.courseName}
            </span>
          )}
        </div>
      </div>
      {!readOnly && !isCompleted && (
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onEdit}
              aria-label={`Edit "${task.title}"`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              onClick={onDelete}
              aria-label={`Delete "${task.title}"`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlannerTaskItem;
