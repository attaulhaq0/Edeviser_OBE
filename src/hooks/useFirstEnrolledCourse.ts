// =============================================================================
// useFirstEnrolledCourseId — the student's first active course enrollment
//
// Shared data-access hook relocated out of `StudentDashboard.tsx` and
// `StudentTeamPage.tsx`, which both contained an identical in-page `useQuery`
// resolving the student's first active course (used to scope team data and the
// team leaderboard). Extracting it to a single hook removes the duplication and
// routes the access through `src/hooks/` per the engineering guardrails.
//
// Uses `.maybeSingle()` so a student with no active enrollment resolves to
// `null` (zero-or-one row) rather than throwing.
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Resolve the student's first active course id.
 *
 * Returns `null` when the student has no active enrollment. The query is only
 * enabled once a `studentId` is available, and an optional `enabled` flag lets
 * callers defer the fetch (the dashboard defers non-critical queries until
 * after first paint).
 */
export const useFirstEnrolledCourseId = (
  studentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, first: true }),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId!)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.course_id ?? null;
    },
    enabled: !!studentId && (options?.enabled ?? true),
  });
};
