// Task 58: Teacher Grading Stats hooks
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { startOfWeek, subDays } from 'date-fns';

export interface GradingStats {
  gradedThisWeek: number;
  avgGradingTimeSeconds: number;
  pendingCount: number;
  gradingStreak: number;
  velocityTrend: Array<{ date: string; count: number }>;
}

export const useGradingStats = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.grades.list({ scope: 'grading_stats', teacherId }),
    queryFn: async (): Promise<GradingStats> => {
      if (!teacherId) throw new Error('teacherId required');

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Graded this week
      const { count: gradedThisWeek } = await supabase
        .from('grades')
        .select('id', { count: 'exact', head: true })
        .eq('graded_by', teacherId)
        .gte('graded_at', weekStart);

      // Pending submissions for teacher's courses
      const { data: courses } = await supabase.from('courses').select('id').eq('teacher_id', teacherId);
      const courseIds = (courses ?? []).map((c) => c.id);
      let pendingCount = 0;
      if (courseIds.length > 0) {
        const { data: assignmentRows } = await supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds);
        const assignmentIds = (assignmentRows ?? []).map((a: { id: string }) => a.id);
        if (assignmentIds.length > 0) {
          const { count } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .in('assignment_id', assignmentIds)
            .eq('status', 'submitted');
          pendingCount = count ?? 0;
        }
      }

      // Velocity trend (last 30 days)
      const { data: recentGrades } = await supabase
        .from('grades')
        .select('graded_at')
        .eq('graded_by', teacherId)
        .gte('graded_at', thirtyDaysAgo);

      const dayMap = new Map<string, number>();
      for (const g of recentGrades ?? []) {
        const d = (g.graded_at as string).slice(0, 10);
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      }

      const velocityTrend = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Grading streak (consecutive days with >=1 grade)
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = subDays(today, i).toISOString().slice(0, 10);
        if (dayMap.has(d)) streak++;
        else break;
      }

      // Average grading time from activity log (grading_start → grading_end pairs)
      const avgGradingTimeSeconds = await calculateAvgGradingTime(teacherId, thirtyDaysAgo);

      return {
        gradedThisWeek: gradedThisWeek ?? 0,
        avgGradingTimeSeconds,
        pendingCount,
        gradingStreak: streak,
        velocityTrend,
      };
    },
    enabled: !!teacherId,
    staleTime: 60_000,
  });
};

/**
 * Calculate average grading time from grading_start/grading_end activity log pairs.
 * Matches pairs by submission_id in metadata, computes duration, and averages.
 */
async function calculateAvgGradingTime(teacherId: string, since: string): Promise<number> {
  const { data: startEvents } = await supabase
    .from('student_activity_log')
    .select('created_at, metadata')
    .eq('student_id', teacherId)
    .eq('event_type', 'grading_start')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const { data: endEvents } = await supabase
    .from('student_activity_log')
    .select('created_at, metadata')
    .eq('student_id', teacherId)
    .eq('event_type', 'grading_end')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (!startEvents?.length || !endEvents?.length) return 0;

  // Build a map of submission_id → earliest start time
  const startMap = new Map<string, string>();
  for (const evt of startEvents) {
    const subId = (evt.metadata as Record<string, unknown> | null)?.submission_id as string | undefined;
    if (subId && !startMap.has(subId)) {
      startMap.set(subId, evt.created_at as string);
    }
  }

  // Match end events to start events by submission_id
  const durations: number[] = [];
  for (const evt of endEvents) {
    const subId = (evt.metadata as Record<string, unknown> | null)?.submission_id as string | undefined;
    if (!subId) continue;
    const startTime = startMap.get(subId);
    if (!startTime) continue;

    const durationMs = new Date(evt.created_at as string).getTime() - new Date(startTime).getTime();
    const durationSec = durationMs / 1000;
    // Ignore unreasonable durations (< 5s or > 2 hours)
    if (durationSec >= 5 && durationSec <= 7200) {
      durations.push(durationSec);
    }
  }

  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
}
