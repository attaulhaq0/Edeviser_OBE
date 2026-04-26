import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pencil, Clock, BookOpen } from 'lucide-react';
import type { StudySession } from '@/types/planner';

interface StudySessionCardProps {
  session: StudySession;
  onStart?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
}

const statusStyles: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

const statusLabels: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const StudySessionCard = ({ session, onStart, onEdit, readOnly = false }: StudySessionCardProps) => {
  const isStartable = session.status === 'planned' && !readOnly;
  const isEditable = session.status === 'planned' && !readOnly;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{session.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">
              {session.plannedStartTime} · {session.plannedDurationMinutes} min
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] shrink-0', statusStyles[session.status])}
        >
          {statusLabels[session.status]}
        </Badge>
      </div>

      {session.courseName && (
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{session.courseName}</span>
        </div>
      )}

      {!readOnly && (isStartable || isEditable) && (
        <div className="flex items-center gap-2 pt-1">
          {isStartable && onStart && (
            <Button
              size="sm"
              className="h-7 text-xs bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
              onClick={onStart}
            >
              <Play className="h-3.5 w-3.5" /> Start
            </Button>
          )}
          {isEditable && onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default StudySessionCard;
