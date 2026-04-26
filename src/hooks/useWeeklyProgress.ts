import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { WeeklyProgressData, CourseStudyTime, CLOStudyTime } from '@/types/planner';

export const useWeeklyProgressSummary = (weekStartDate: string) => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split('T')[0] as string;

  return useQuery({
    queryKey: queryKeys.weeklyPlanner.progress(studentId, weekStartDate),
    queryFn: async (): Promise<WeeklyProgressData> => {
      const { data: sessions, error: sessErr } = await supabase
        .from('study_sessions')
        .select('actual_duration_minutes, status, course_id, clo_ids, courses(name)')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gte('planned_date', weekStartDate)
        .lte('planned_date', weekEndDate);
      if (sessErr) throw sessErr;

      const { data: tasks, error: taskErr } = await supabase
        .from('planner_tasks')
        .select('status')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gte('due_date', weekStartDate)
        .lte('due_date', weekEndDate);
      if (taskErr) throw taskErr;

      const completedSessions = sessions ?? [];
      const totalStudyMinutes = completedSessions.reduce(
        (sum: number, s: Record<string, unknown>) => sum + ((s.actual_duration_minutes as number) ?? 0), 0,
      );

      // Course breakdown
      const courseMap = new Map<string, { name: string; minutes: number }>();
      for (const s of completedSessions) {
        const courseId = s.course_id as string;
        const courseName = (s.courses as unknown as Record<string, unknown> | null)?.name as string ?? 'Unknown';
        const existing = courseMap.get(courseId) ?? { name: courseName, minutes: 0 };
        existing.minutes += (s.actual_duration_minutes as number) ?? 0;
        courseMap.set(courseId, existing);
      }
      const courseBreakdown: CourseStudyTime[] = Array.from(courseMap.entries()).map(([courseId, v]) => ({
        courseId, courseName: v.name, totalMinutes: v.minutes,
      }));

      // CLO breakdown (simplified)
      const cloBreakdown: CLOStudyTime[] = [];

      return {
        totalStudyMinutes,
        sessionsCompleted: completedSessions.length,
        tasksCompleted: (tasks ?? []).length,
        courseBreakdown,
        cloBreakdown,
      };
    },
    enabled: !!studentId && !!weekStartDate,
  });
};
