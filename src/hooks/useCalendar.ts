import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type CalendarEventSource = 'assignment' | 'quiz' | 'class_session' | 'academic_calendar' | 'announcement';
export type CalendarEventType = 'assignment' | 'quiz' | 'class_session' | 'academic';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  source?: CalendarEventSource;
  type?: CalendarEventType;
  course_id?: string;
  course_name?: string;
  color?: string;
}

const COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b',
  '#22c55e', '#14b8a6', '#ec4899', '#6366f1',
];

export const buildColorMap = (courseIds: string[]): Record<string, string> => {
  const unique = [...new Set(courseIds)];
  const map: Record<string, string> = {};
  for (let i = 0; i < unique.length; i++) {
    const key = unique[i];
    if (key) map[key] = COLOR_PALETTE[i % COLOR_PALETTE.length] ?? '#3b82f6';
  }
  return map;
};

export const getDeadlineUrgency = (deadline: string | Date): 'red' | 'yellow' | 'green' => {
  const deadlineMs = new Date(deadline).getTime();
  const hoursLeft = (deadlineMs - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 24) return 'red';
  if (hoursLeft <= 72) return 'yellow';
  return 'green';
};

export const useCalendarEvents = (month?: number, year?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['calendarEvents', month, year, user?.id],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const events: CalendarEvent[] = [];
      const now = new Date();
      const m = month ?? now.getMonth() + 1;
      const y = year ?? now.getFullYear();
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextM = m + 1 > 12 ? 1 : m + 1;
      const nextY = m + 1 > 12 ? y + 1 : y;
      const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date, course_id')
        .gte('due_date', startDate)
        .lt('due_date', endDate);

      for (const a of assignments ?? []) {
        events.push({ id: a.id, title: a.title, date: a.due_date, type: 'assignment', course_id: a.course_id, color: '#3b82f6' });
      }

      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, due_date, course_id')
        .gte('due_date', startDate)
        .lt('due_date', endDate);

      for (const q of quizzes ?? []) {
        if (q.due_date) {
          events.push({ id: q.id, title: q.title, date: q.due_date, type: 'quiz', course_id: q.course_id, color: '#8b5cf6' });
        }
      }

      const { data: academic } = await supabase
        .from('academic_calendar_events')
        .select('id, title, start_date')
        .gte('start_date', startDate)
        .lt('start_date', endDate);

      for (const e of academic ?? []) {
        events.push({ id: e.id, title: e.title, date: e.start_date, type: 'academic', color: '#f59e0b' });
      }

      return events;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};
