// =============================================================================
// useTutorAnalytics — TanStack Query hook for teacher tutor analytics
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchTutorAnalytics } from '@/lib/tutorApi';
import type { TutorAnalyticsResponse } from '@/lib/tutorSchemas';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string;
  end: string;
}

// ─── useTutorAnalytics — teacher analytics for a course ──────────────────────

export const useTutorAnalytics = (courseId: string, dateRange?: DateRange) => {
  return useQuery({
    queryKey: dateRange
      ? queryKeys.tutorAnalytics.byCourseAndRange(courseId, dateRange.start, dateRange.end)
      : queryKeys.tutorAnalytics.byCourse(courseId),
    queryFn: async (): Promise<TutorAnalyticsResponse> => {
      return fetchTutorAnalytics({
        course_id: courseId,
        start_date: dateRange?.start,
        end_date: dateRange?.end,
      });
    },
    enabled: !!courseId,
    staleTime: 60_000, // Analytics data doesn't change as frequently
  });
};
