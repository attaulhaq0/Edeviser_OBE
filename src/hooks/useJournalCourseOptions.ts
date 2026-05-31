// =============================================================================
// useJournalCourseOptions — enrolled-course options for the journal composer
// Feature: student-experience-remediation, Task 25.1 / 25.7
// Requirements: 25.1, 25.2, 25.3
// -----------------------------------------------------------------------------
// Relocated from the in-page `useEnrolledCourseOptions` hook in
// `StudentJournalPage.tsx`, which called `supabase.from(...)` directly inside
// the component (an ARCH-VIOLATION under R25). Data access now lives in a hook.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JournalCourseOption {
  id: string;
  name: string;
  code: string;
}

/** Shape of the embedded `courses` row returned by the enrollment select. */
interface EnrollmentCourseJoin {
  id: string;
  name: string;
  code: string;
}

// ─── useJournalCourseOptions ─────────────────────────────────────────────────

/**
 * The student's active course enrollments as lightweight options for the
 * journal composer's course picker.
 */
export const useJournalCourseOptions = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, view: "journal" }),
    queryFn: async (): Promise<JournalCourseOption[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("student_courses")
        .select("course_id, courses!inner(id, name, code)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const course = row.courses as unknown as EnrollmentCourseJoin;
        return {
          id: course.id,
          name: course.name,
          code: course.code,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};
