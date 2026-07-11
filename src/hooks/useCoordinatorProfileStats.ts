// =============================================================================
// useCoordinatorProfileStats — real "Programs I Manage" + workspace counts
// =============================================================================
//
// Aggregate read hook (UI prototype migration, Phase A backend wiring) that
// powers the coordinator "Me" page header tiles and the "Programs I Manage"
// list with REAL data. Reads existing tables only (no new backend, no writes):
//   • programs        — scoped to the signed-in coordinator via `coordinator_id`
//   • courses         — the courses inside those programs (program_id, teacher_id)
//   • student_courses — enrolments used for the distinct student count
//   • profiles        — is_active flags for the connected faculty split
//
// RLS already scopes each read to the caller's institution/programs
// (`programs_institution_read`, `courses_institution_read`,
// `student_courses_admin_read` for the coordinator role), so filtering by
// `coordinator_id` narrows the institution-visible rows down to the ones this
// coordinator owns. All aggregation is client-side over small, projected
// payloads (single batched `.in(...)` queries — no N+1).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CoordinatorProgramSummary {
  id: string;
  code: string;
  name: string;
  courseCount: number;
  studentCount: number;
}

export interface CoordinatorProfileStats {
  programs: CoordinatorProgramSummary[];
  totals: {
    programs: number;
    courses: number;
    students: number;
    faculty: number;
    facultyActive: number;
    facultyInactive: number;
  };
}

interface ProgramRow {
  id: string;
  code: string;
  name: string;
}
interface CourseRow {
  id: string;
  program_id: string;
  teacher_id: string | null;
}
interface EnrollRow {
  student_id: string;
  course_id: string;
}
interface FacultyRow {
  id: string;
  is_active: boolean | null;
}

const EMPTY: CoordinatorProfileStats = {
  programs: [],
  totals: {
    programs: 0,
    courses: 0,
    students: 0,
    faculty: 0,
    facultyActive: 0,
    facultyInactive: 0,
  },
};

export const useCoordinatorProfileStats = (coordinatorId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.coordinatorDashboard.list({
      view: "profileStats",
      coordinatorId: coordinatorId ?? null,
    }),
    enabled: !!coordinatorId,
    queryFn: async (): Promise<CoordinatorProfileStats> => {
      // 1. Programs coordinated by this user.
      const { data: programsData, error: programsError } = await supabase
        .from("programs")
        .select("id, code, name")
        .eq("coordinator_id", coordinatorId!)
        .order("code", { ascending: true });
      if (programsError) throw programsError;
      const programs = (programsData ?? []) as ProgramRow[];
      if (programs.length === 0) return EMPTY;

      const programIds = programs.map((p) => p.id);

      // 2. Courses within those programs.
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, program_id, teacher_id")
        .in("program_id", programIds);
      if (coursesError) throw coursesError;
      const courses = (coursesData ?? []) as CourseRow[];
      const courseIds = courses.map((c) => c.id);
      const courseToProgram = new Map<string, string>(
        courses.map((c) => [c.id, c.program_id])
      );

      // 3. Enrolments within those courses (distinct students).
      let enrollments: EnrollRow[] = [];
      if (courseIds.length > 0) {
        const { data: enrollData, error: enrollError } = await supabase
          .from("student_courses")
          .select("student_id, course_id")
          .in("course_id", courseIds);
        if (enrollError) throw enrollError;
        enrollments = (enrollData ?? []) as EnrollRow[];
      }

      // 4. Faculty active/inactive split (batched, no N+1).
      const facultyIds = Array.from(
        new Set(
          courses.map((c) => c.teacher_id).filter((id): id is string => !!id)
        )
      );
      let facultyActive = 0;
      let facultyInactive = 0;
      if (facultyIds.length > 0) {
        const { data: facultyData, error: facultyError } = await supabase
          .from("profiles")
          .select("id, is_active")
          .in("id", facultyIds);
        if (facultyError) throw facultyError;
        for (const f of (facultyData ?? []) as FacultyRow[]) {
          if (f.is_active === false) facultyInactive += 1;
          else facultyActive += 1;
        }
      }

      // Per-program course counts + distinct student sets.
      const courseCountByProgram = new Map<string, number>();
      for (const c of courses) {
        courseCountByProgram.set(
          c.program_id,
          (courseCountByProgram.get(c.program_id) ?? 0) + 1
        );
      }
      const studentsByProgram = new Map<string, Set<string>>();
      const allStudents = new Set<string>();
      for (const e of enrollments) {
        allStudents.add(e.student_id);
        const pid = courseToProgram.get(e.course_id);
        if (!pid) continue;
        const set = studentsByProgram.get(pid) ?? new Set<string>();
        set.add(e.student_id);
        studentsByProgram.set(pid, set);
      }

      const programSummaries: CoordinatorProgramSummary[] = programs.map(
        (p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          courseCount: courseCountByProgram.get(p.id) ?? 0,
          studentCount: studentsByProgram.get(p.id)?.size ?? 0,
        })
      );

      return {
        programs: programSummaries,
        totals: {
          programs: programs.length,
          courses: courses.length,
          students: allStudents.size,
          faculty: facultyIds.length,
          facultyActive,
          facultyInactive,
        },
      };
    },
  });
};
