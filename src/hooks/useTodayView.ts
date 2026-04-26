import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { StudySession, PlannerTask, UpcomingDeadline, HabitStatus, DailyProgress } from '@/types/planner';

interface TodayViewData {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  habits: HabitStatus;
  progress: DailyProgress;
  isLoading: boolean;
}

export const useTodayViewData = (): TodayViewData => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const today = new Date().toISOString().split('T')[0] as string;
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const deadlineEnd = threeDaysLater.toISOString().split('T')[0] as string;

  const sessionsQuery = useQuery({
    queryKey: queryKeys.weeklyPlanner.today(studentId, today),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .eq('planned_date', today)
        .order('planned_start_time');
      if (error) throw error;
      return (data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        studentId: s.student_id as string,
        courseId: s.course_id as string,
        courseName: (s.courses as Record<string, unknown> | null)?.name as string | undefined,
        title: s.title as string,
        description: s.description as string | null,
        plannedDate: s.planned_date as string,
        plannedStartTime: s.planned_start_time as string,
        plannedDurationMinutes: s.planned_duration_minutes as number,
        actualStartAt: s.actual_start_at as string | null,
        actualEndAt: s.actual_end_at as string | null,
        actualDurationMinutes: s.actual_duration_minutes as number | null,
        timerMode: s.timer_mode as 'pomodoro' | 'custom',
        status: s.status as 'planned' | 'in_progress' | 'completed' | 'cancelled',
        satisfactionRating: s.satisfaction_rating as number | null,
        cloIds: s.clo_ids as string[] | null,
        createdAt: s.created_at as string,
      })) as StudySession[];
    },
    enabled: !!studentId,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.plannerTasks.list({ studentId, dueDate: today } as Record<string, unknown>),
    queryFn: async (): Promise<PlannerTask[]> => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .eq('due_date', today)
        .order('priority');
      if (error) throw error;
      return (data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        studentId: t.student_id as string,
        title: t.title as string,
        description: t.description as string | null,
        dueDate: t.due_date as string,
        priority: t.priority as 'low' | 'medium' | 'high',
        status: t.status as 'pending' | 'completed',
        courseId: t.course_id as string | null,
        courseName: (t.courses as Record<string, unknown> | null)?.name as string | undefined,
        completedAt: t.completed_at as string | null,
        createdAt: t.created_at as string,
      }));
    },
    enabled: !!studentId,
  });

  const deadlinesQuery = useQuery({
    queryKey: queryKeys.assignments.list({ studentId, from: today, to: deadlineEnd, type: 'todayDeadlines' } as Record<string, unknown>),
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'active');
      const courseIds = (enrollments ?? []).map((e: Record<string, unknown>) => e.course_id as string);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_date, courses(name)')
        .in('course_id', courseIds)
        .gte('due_date', today)
        .lte('due_date', deadlineEnd)
        .order('due_date');
      if (error) throw error;
      const now = new Date();
      return (data ?? []).map((a: Record<string, unknown>) => {
        const dueDate = a.due_date as string;
        const hoursUntilDue = (new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        let urgency: 'red' | 'yellow' | 'green' = 'green';
        if (hoursUntilDue <= 24) urgency = 'red';
        else if (hoursUntilDue <= 72) urgency = 'yellow';
        return { id: a.id as string, title: a.title as string, courseName: (a.courses as Record<string, unknown> | null)?.name as string ?? '', dueDate, urgency };
      });
    },
    enabled: !!studentId,
  });

  const habitsQuery = useQuery({
    queryKey: queryKeys.habitLogs.list({ studentId, date: today } as Record<string, unknown>),
    queryFn: async (): Promise<HabitStatus> => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_type')
        .eq('student_id', studentId)
        .eq('date', today);
      if (error) throw error;
      const types = new Set((data ?? []).map((h: Record<string, unknown>) => h.habit_type as string));
      return { login: types.has('login'), submit: types.has('submit'), journal: types.has('journal'), read: types.has('read') };
    },
    enabled: !!studentId,
  });

  const sessions = sessionsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const progress: DailyProgress = {
    studyMinutes: sessions.filter((s) => s.status === 'completed').reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0),
    tasksCompleted: tasks.filter((t) => t.status === 'completed').length,
    sessionsCompleted: sessions.filter((s) => s.status === 'completed').length,
  };

  return {
    sessions,
    tasks,
    deadlines: deadlinesQuery.data ?? [],
    habits: habitsQuery.data ?? { login: false, submit: false, journal: false, read: false },
    progress,
    isLoading: sessionsQuery.isLoading || tasksQuery.isLoading || deadlinesQuery.isLoading || habitsQuery.isLoading,
  };
};
