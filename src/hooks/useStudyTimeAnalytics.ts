import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { aggregateWeeklyStudyTime } from '@/lib/plannerUtils';
import type { WeeklyStudyData, StudySession } from '@/types/planner';

export const useStudyTimeTrend = (weekCount: number = 8) => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.weeklyPlanner.studyTimeTrend(studentId, weekCount),
    queryFn: async (): Promise<{ data: WeeklyStudyData[]; average: number }> => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - weekCount * 7);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('planned_date, actual_duration_minutes, status')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gte('planned_date', startDate.toISOString().split('T')[0]);
      if (error) throw error;

      const sessions = (data ?? []).map((s: Record<string, unknown>) => ({
        plannedDate: s.planned_date as string,
        actualDurationMinutes: s.actual_duration_minutes as number | null,
        status: s.status as string,
      })) as Pick<StudySession, 'plannedDate' | 'actualDurationMinutes' | 'status'>[];

      const weeklyData = aggregateWeeklyStudyTime(sessions as StudySession[], weekCount, today);
      const totalMinutes = weeklyData.reduce((sum, w) => sum + w.totalMinutes, 0);
      const average = weeklyData.length > 0 ? Math.round(totalMinutes / weeklyData.length) : 0;

      return { data: weeklyData, average };
    },
    enabled: !!studentId,
  });
};
