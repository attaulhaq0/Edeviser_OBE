import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { fetchTutorAnalytics } from '@/lib/tutorApi';
import type { TutorAnalyticsResponse } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string;
  end: string;
}

// ─── useTutorAnalytics — teacher analytics for a course ─────────────────────

export const useTutorAnalytics = (courseId: string, dateRange?: DateRange) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: dateRange
      ? queryKeys.tutorAnalytics.courseRange(courseId, dateRange.start, dateRange.end)
      : queryKeys.tutorAnalytics.course(courseId),
    queryFn: async (): Promise<TutorAnalyticsResponse> => {
      if (!user) throw new Error('Not authenticated');

      const result = await fetchTutorAnalytics(
        courseId,
        dateRange?.start,
        dateRange?.end,
      );

      return result as TutorAnalyticsResponse;
    },
    enabled: !!user && !!courseId,
  });
};
