// =============================================================================
// useSurveyAssignmentsCount — TanStack Query hook for the count of surveys a
// student is currently assigned (i.e. can respond to).
//
// Task 7.8: drives the conditional "Surveys" navigation item.
//   - count === 0 → hide the Surveys nav item              [R23.1]
//   - count  >  0 → show the Surveys nav item              [R23.2]
//   - when the last assigned survey is unassigned, an existing survey mutation
//     invalidates `queryKeys.surveys.lists()`, which also matches this query's
//     key prefix, so the count refetches and the item hides immediately. [R23.2a]
//
// There is no separate `survey_assignments` table: surveys are institution-
// scoped and exposed to a student via RLS, and the student-facing
// `SurveyResponsePage` treats the set of *active* surveys as those the student
// can respond to. The "assigned count" is therefore the number of active
// surveys visible to the caller under RLS.
//
// Uses a head/count query (`head: true`, `count: "exact"`) so only the count is
// returned over the wire — full survey rows are never fetched. [perf]
// _Requirements: 23.1, 23.2, 23.2a_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// Reused under the `surveys` entity so the existing survey mutations'
// `invalidateQueries({ queryKey: queryKeys.surveys.lists() })` also invalidate
// this count (keeping R23.2a's "hide immediately" behavior automatic).
const ASSIGNED_COUNT_FILTERS = {
  assignedCount: true,
  activeOnly: true,
} as const;

/**
 * Returns the count of surveys the current student is assigned (can respond to).
 *
 * The query resolves to a non-negative integer. A genuine query failure is
 * rethrown and surfaces through the query's `error`/`isError`; consumers should
 * treat an absent/`undefined` value (loading or error) as "no count yet" and
 * therefore keep the Surveys nav item hidden until a positive count is known.
 *
 * @param options.enabled - When `false`, the underlying query is not executed
 *   (e.g. the sidebar only needs the count for the student role). Defaults to
 *   `true` so existing callers keep their behavior.
 */
export const useSurveyAssignmentsCount = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.surveys.list(ASSIGNED_COUNT_FILTERS),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("surveys")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: options?.enabled ?? true,
  });
};
