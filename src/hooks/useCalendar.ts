import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';

export type CalendarEventSource = 'assignment' | 'quiz' | 'class_session' | 'academic_calendar' | 'announcement';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  source: CalendarEventSource;
  course_id?: string;
  course_name?: string;
  color: string;
}

const COURSE_COLORS: string[] = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#14b8a6','#ec4899','#6366f1'];
const ACADEMIC_COLOR = '#64748b';
const DEFAULT_COLOR = '#3b82f6';

export const buildColorMap = (courseIds: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  const unique = Array.from(new Set(courseIds));
  for (let i = 0; i < unique.length; i++) {
    const id = unique[i];
    if (id) map[id] = COURSE_COLORS[i % COURSE_COLORS.length] ?? DEFAULT_COLOR;
  }
  return map;
};

export function getDeadlineUrgency(dueDate: string): 'red' | 'yellow' | 'green' {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const hoursLeft = (due - now) / (1000 * 60 * 60);
  if (hoursLeft < 24) return 'red';
  if (hoursLeft < 72) return 'yellow';
  return 'green';
}

export const useCalendarEvents = (month: number, year: number) => {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: queryKeys.calendarEvents.list({ userId: user?.id ?? '', month, year }),
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!user) return [];
      const monthStr = String(month).padStart(2, '0');
      const startDate = year + '-' + monthStr + '-01';
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = year + '-' + monthStr + '-' + String(lastDay).padStart(2, '0');
      let courseIds: string[] = [];
      if (role === 'student') {
        const { data: enrollments } = await supabase.from('student_courses').select('course_id').eq('student_id', user.id);
        courseIds = (enrollments ?? []).map((e) => e.course_id);
      } else if (role === 'teacher') {
        const { data: courses } = await supabase.from('courses').select('id').eq('teacher_id', user.id);
        courseIds = (courses ?? []).map((c) => c.id);
      }
      const colorMap = buildColorMap(courseIds);
      const events: CalendarEvent[] = [];
      if (courseIds.length > 0) {
        const { data: assignments } = await supabase.from('assignments').select('id, title, due_date, course_id, courses(name)').in('course_id', courseIds).gte('due_date', startDate).lte('due_date', endDate + 'T23:59:59');
        for (const a of assignments ?? []) {
          const cid = String(a.course_id);
          events.push({ id: 'assignment-' + a.id, title: String(a.title), date: String(a.due_date), source: 'assignment', course_id: cid, course_name: (a.courses as { name: string } | null)?.name ?? '', color: colorMap[cid] ?? DEFAULT_COLOR });
        }
        const { data: quizzes } = await supabase.from('quizzes').select('id, title, due_date, course_id, courses(name)').in('course_id', courseIds).not('due_date', 'is', null).gte('due_date', startDate).lte('due_date', endDate + 'T23:59:59');
        for (const q of quizzes ?? []) {
          if (q.due_date) {
            const cid = String(q.course_id);
            events.push({ id: 'quiz-' + q.id, title: String(q.title), date: String(q.due_date), source: 'quiz', course_id: cid, course_name: (q.courses as { name: string } | null)?.name ?? '', color: colorMap[cid] ?? DEFAULT_COLOR });
          }
        }
        const { data: sectionData } = await supabase.from('course_sections').select('id, course_id, courses(name)').in('course_id', courseIds);
        const sectionIds = (sectionData ?? []).map((s) => s.id);
        const sMap = new Map<string, { course_id: string; course_name: string }>();
        for (const s of sectionData ?? []) { sMap.set(s.id, { course_id: String(s.course_id), course_name: (s.courses as { name: string } | null)?.name ?? '' }); }
        if (sectionIds.length > 0) {
          const { data: sessions } = await supabase.from('class_sessions').select('id, session_date, section_id').in('section_id', sectionIds).gte('session_date', startDate).lte('session_date', endDate);
          for (const s of sessions ?? []) {
            const info = sMap.get(s.section_id);
            const cId = info?.course_id ?? '';
            events.push({ id: 'session-' + s.id, title: 'Class: ' + (info?.course_name ?? 'Session'), date: String(s.session_date), source: 'class_session', course_id: cId, course_name: info?.course_name ?? '', color: colorMap[cId] ?? DEFAULT_COLOR });
          }
        }
      }
      const { data: academicEvents } = await supabase.from('academic_calendar_events').select('id, title, start_date, end_date').gte('start_date', startDate).lte('start_date', endDate);
      for (const e of academicEvents ?? []) {
        events.push({ id: 'academic-' + e.id, title: String(e.title), date: String(e.start_date), end_date: e.end_date ? String(e.end_date) : undefined, source: 'academic_calendar', color: ACADEMIC_COLOR });
      }
      return events;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });
};
