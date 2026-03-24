// =============================================================================
// CalendarEventCard — Calendar event display card
// =============================================================================

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type EventType = 'assignment' | 'quiz' | 'exam' | 'class' | 'holiday' | 'other';

interface CalendarEventCardProps {
  title: string;
  date: string;
  time?: string;
  eventType: EventType;
  courseName?: string;
  className?: string;
}

const EVENT_STYLES: Record<EventType, { bg: string; text: string; dot: string }> = {
  assignment: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  quiz: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  exam: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  class: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  holiday: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  other: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

const CalendarEventCard = ({
  title,
  date,
  time,
  eventType,
  courseName,
  className,
}: CalendarEventCardProps) => {
  const style = EVENT_STYLES[eventType];

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3', className)}>
      <div className={cn('mt-0.5 h-2.5 w-2.5 rounded-full shrink-0', style.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {courseName && <p className="text-xs text-gray-500">{courseName}</p>}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{date}</span>
          {time && <span>· {time}</span>}
        </div>
      </div>
      <span className={cn('text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded', style.bg, style.text)}>
        {eventType}
      </span>
    </div>
  );
};

export default CalendarEventCard;
export { EVENT_STYLES };
export type { CalendarEventCardProps, EventType };
