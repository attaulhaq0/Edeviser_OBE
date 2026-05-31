// =============================================================================
// useTeamFormation — data-access hooks for the student team-creation flow
//
// Relocated from in-page `useQuery` hooks in `CreateTeamPage.tsx`:
//   - `useStudentFormedCourses` — the student's active courses whose
//     `team_formation_mode` is `student_formed` (the courses in which a student
//     may form their own team).
//   - `useCourseRoster` — the active students in a course, excluding the
//     current user, used to populate the member-invite list.
//
// Both follow the project's standard TanStack Query conventions (query keys +
// typed responses) and keep all Supabase access in `src/hooks/`.
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentFormedCourseOption {
  id: string;
  name: string;
  team_formation_mode: string;
}

export interface TeamRosterStudent {
  student_id: string;
  full_name: string;
}

// ─── useStudentFormedCourses ────────────────────────────────────────────────

/**
 * Active courses the student is enrolled in whose `team_formation_mode` is
 * `student_formed`. Returns an empty array when the student has no active
 * enrollments.
 */
export const useStudentFormedCourses = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ studentId, studentFormed: true }),
    queryFn: async (): Promise<StudentFormedCourseOption[]> => {
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId!)
        .eq("status", "active");
      if (enrollError) throw enrollError;

      const courseIds = (enrollments ?? []).map((e) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("courses")
        .select("id, name, team_formation_mode")
        .in("id", courseIds)
        .eq("team_formation_mode", "student_formed");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studentId,
  });
};

// ─── useCourseRoster ──────────────────────────────────────────────────────────

/**
 * Active students in a course, excluding `excludeStudentId` (the current user),
 * for the team member-invite list.
 */
export const useCourseRoster = (
  courseId?: string,
  excludeStudentId?: string
) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId, roster: true }),
    queryFn: async (): Promise<TeamRosterStudent[]> => {
      const { data, error } = await supabase
        .from("student_courses")
        .select("student_id, profiles!inner(full_name)")
        .eq("course_id", courseId!)
        .eq("status", "active")
        .neq("student_id", excludeStudentId ?? "");
      if (error) throw error;

      return (data ?? []).map((row) => ({
        student_id: row.student_id,
        full_name: row.profiles?.full_name ?? "",
      }));
    },
    enabled: !!courseId,
  });
};
