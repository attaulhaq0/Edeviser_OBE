import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CoordinatorCohortRow {
  id: string;
  label: string;
  semesterName: string;
  programName: string;
  meanAttainment: number;
  studentCount: number;
  evidenceCount: number;
}

interface CourseRow {
  id: string;
  name: string;
  code: string;
  program_id: string;
  semester_id: string | null;
}

interface ProgramRow {
  id: string;
  name: string;
}

interface EnrollmentRow {
  course_id: string;
  student_id: string;
  status: string;
}

interface AttainmentRow {
  course_id: string | null;
  student_id: string | null;
  attainment_percent: number;
  scope: string;
}

interface SemesterRow {
  id: string;
  name: string;
}

/**
 * Compares measured attainment across the institution's live program/semester
 * cohorts. Cohorts are only emitted when they have active enrolments and
 * student-scoped evidence; empty or unmeasured cohorts are not fabricated.
 */
export const useCoordinatorCohortComparison = (institutionId?: string | null) =>
  useQuery({
    queryKey: queryKeys.cohortComparison.list({
      view: "coordinatorCohortComparison",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    queryFn: async (): Promise<CoordinatorCohortRow[]> => {
      if (!institutionId) return [];

      const { data: programs, error: programsError } = await supabase
        .from("programs")
        .select("id, name")
        .eq("institution_id", institutionId);
      if (programsError) throw programsError;

      const programRows = (programs ?? []) as ProgramRow[];
      const programIds = programRows.map((program) => program.id);
      if (programIds.length === 0) return [];

      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, name, code, program_id, semester_id")
        .in("program_id", programIds)
        .eq("is_active", true);
      if (coursesError) throw coursesError;

      const courseRows = (courses ?? []) as CourseRow[];
      const courseIds = courseRows.map((course) => course.id);
      if (courseIds.length === 0) return [];

      const [
        { data: enrollments, error: enrollmentsError },
        { data: attainment, error: attainmentError },
      ] = await Promise.all([
        supabase
          .from("student_courses")
          .select("course_id, student_id, status")
          .in("course_id", courseIds)
          .eq("status", "active"),
        supabase
          .from("outcome_attainment")
          .select("course_id, student_id, attainment_percent, scope")
          .in("course_id", courseIds)
          .eq("scope", "student_course"),
      ]);
      if (enrollmentsError) throw enrollmentsError;
      if (attainmentError) throw attainmentError;

      const courseById = new Map(
        courseRows.map((course) => [course.id, course])
      );
      const programById = new Map(
        programRows.map((program) => [program.id, program])
      );
      const enrolled = new Set(
        ((enrollments ?? []) as EnrollmentRow[]).map(
          (row) => `${row.course_id}:${row.student_id}`
        )
      );
      const semesterIds = Array.from(
        new Set(
          courseRows.flatMap((course) =>
            course.semester_id ? [course.semester_id] : []
          )
        )
      );

      const { data: semesters, error: semestersError } = await supabase
        .from("semesters")
        .select("id, name")
        .eq("institution_id", institutionId)
        .in(
          "id",
          semesterIds.length > 0
            ? semesterIds
            : ["00000000-0000-0000-0000-000000000000"]
        );
      if (semestersError) throw semestersError;

      const semesterById = new Map(
        ((semesters ?? []) as SemesterRow[]).map((semester) => [
          semester.id,
          semester.name,
        ])
      );
      const cohorts = new Map<
        string,
        {
          label: string;
          semesterName: string;
          programName: string;
          students: Set<string>;
          scores: number[];
        }
      >();

      for (const row of (attainment ?? []) as AttainmentRow[]) {
        if (
          !row.course_id ||
          !row.student_id ||
          !enrolled.has(`${row.course_id}:${row.student_id}`)
        )
          continue;
        const course = courseById.get(row.course_id);
        if (!course) continue;
        const programName =
          programById.get(course.program_id)?.name ?? "Program";
        const semesterName = course.semester_id
          ? semesterById.get(course.semester_id) ?? "Unlabelled semester"
          : "Unlabelled semester";
        const id = `${course.program_id}:${course.semester_id ?? "none"}`;
        const cohort = cohorts.get(id) ?? {
          label: `${programName} · ${semesterName}`,
          semesterName,
          programName,
          students: new Set<string>(),
          scores: [],
        };
        cohort.students.add(row.student_id);
        cohort.scores.push(row.attainment_percent);
        cohorts.set(id, cohort);
      }

      return Array.from(cohorts.entries())
        .map(([id, cohort]) => ({
          id,
          label: cohort.label,
          semesterName: cohort.semesterName,
          programName: cohort.programName,
          meanAttainment: Math.round(
            cohort.scores.reduce((sum, score) => sum + score, 0) /
              cohort.scores.length
          ),
          studentCount: cohort.students.size,
          evidenceCount: cohort.scores.length,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
  });
