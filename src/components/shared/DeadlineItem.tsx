import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import type { UpcomingDeadline } from '@/types/planner';

interface DeadlineItemProps {
  assignment: UpcomingDeadline;
}

const urgencyStyles: Record<string, string> = {
  red: 'border-s-red-500 bg-red-50/50',
  yellow: 'border-s-amber-500 bg-amber-50/50',
  green: 'border-s-green-500 bg-green-50/50',
};

const urgencyIconColor: Record<string, string> = {
  red: 'text-red-500',
  yellow: 'text-amber-500',
  green: 'text-green-500',
};

const DeadlineItem = ({ assignment }: DeadlineItemProps) => {
  const dueDate = new Date(assignment.dueDate);
  const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div
      className={cn(
        'border-s-2 rounded-e-lg px-3 py-2 space-y-0.5',
        urgencyStyles[assignment.urgency],
      )}
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', urgencyIconColor[assignment.urgency])} />
        <p className="text-sm font-medium truncate">{assignment.title}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{assignment.courseName}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dateStr} {timeStr}
        </span>
      </div>
    </div>
  );
};

export default DeadlineItem;
