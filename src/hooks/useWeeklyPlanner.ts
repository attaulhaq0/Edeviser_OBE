import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { StudySession, PlannerTask, WeeklyGoal, UpcomingDeadline } from '@/types/planner';

interface WeeklyPlannerData {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  goals: WeeklyGoal[];
  isLoading: boolean;
}

export const useWeeklyPlannerData = (weekStartDate: string): WeeklyPlannerData => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split('T')[0] as string;

  const sessionsQuery = useQuery({
    queryKey: queryKeys.studySessions.list({ studentId, weekStartDate, weekEndDate } as Record<string, unknown>),
    queryFn: async (): Promise<StudySession[]> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .gte('planned_date', weekStartDate)
        .lte('planned_date', weekEndDate)
        .order('planned_date')
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
      }));
    },
    enabled: !!studentId,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.plannerTasks.list({ studentId, weekStartDate, weekEndDate } as Record<string, unknown>),
    queryFn: async (): Promise<PlannerTask[]> => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .gte('due_date', weekStartDate)
        .lte('due_date', weekEndDate)
        .order('due_date');
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
    queryKey: queryKeys.assignments.list({ studentId, weekStartDate, weekEndDate, type: 'deadlines' } as Record<string, unknown>),
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      // Get enrolled course IDs
      const { data: enrollments, error: enrollErr } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'active');
      if (enrollErr) throw enrollErr;
      const courseIds = (enrollments ?? []).map((e: Record<string, unknown>) => e.course_id as string);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_date, courses(name)')
        .in('course_id', courseIds)
        .gte('due_date', weekStartDate)
        .lte('due_date', weekEndDate)
        .order('due_date');
      if (error) throw error;
      const now = new Date();
      return (data ?? []).map((a: Record<string, unknown>) => {
        const dueDate = a.due_date as string;
        const hoursUntilDue = (new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        let urgency: 'red' | 'yellow' | 'green' = 'green';
        if (hoursUntilDue <= 24) urgency = 'red';
        else if (hoursUntilDue <= 72) urgency = 'yellow';
        return {
          id: a.id as string,
          title: a.title as string,
          courseName: (a.courses as Record<string, unknown> | null)?.name as string ?? '',
          dueDate,
          urgency,
        };
      });
    },
    enabled: !!studentId,
  });

  const goalsQuery = useQuery({
    queryKey: queryKeys.weeklyGoals.list({ studentId, weekStartDate } as Record<string, unknown>),
    queryFn: async (): Promise<WeeklyGoal[]> => {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start_date', weekStartDate);
      if (error) throw error;
      return (data ?? []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        studentId: g.student_id as string,
        weekStartDate: g.week_start_date as string,
        goalType: g.goal_type as 'study_hours' | 'sessions_completed' | 'tasks_completed',
        targetValue: Number(g.target_value),
      }));
    },
    enabled: !!studentId,
  });

  return {
    sessions: sessionsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    deadlines: deadlinesQuery.data ?? [],
    goals: goalsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading || tasksQuery.isLoading || deadlinesQuery.isLoading || goalsQuery.isLoading,
  };
};
