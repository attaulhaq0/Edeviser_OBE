// =============================================================================
// useStudentProgress — per-course attainment summary for the My Progress page
//
// Relocated from the in-page `useStudentProgress` hook in
// `StudentProgressPage.tsx`. Aggregates the student's active enrollments,
// per-course `outcome_attainment`, and per-course CLO counts into a single
// `ProgressSummary`, batching the underlying queries (no per-course N+1).
//
// Keeps all Supabase access in `src/hooks/` and uses the project's standard
// TanStack Query conventions (query keys + typed responses).
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseProgress {
  course_id: string;
  course_name: string;
  course_code: string;
  attainment_percent: number;
  clo_count: number;
  evidence_count: number;
}

export interface ProgressSummary {
  totalCourses: number;
  averageAttainment: number;
  excellentCount: number;
  satisfactoryCount: number;
  developingCount: number;
  notYetCount: number;
  perCourse: CourseProgress[];
}

const emptySummary = (): ProgressSummary => ({
  totalCourses: 0,
  averageAttainment: 0,
  excellentCount: 0,
  satisfactoryCount: 0,
  developingCount: 0,
  notYetCount: 0,
  perCourse: [],
});

// ─── useStudentProgress ───────────────────────────────────────────────────────

export const useStudentProgress = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.list({ studentId, view: "progress" }),
    queryFn: async (): Promise<ProgressSummary> => {
      if (!studentId) return emptySummary();

      // Enrolled courses with course details.
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_courses")
        .select(`course_id, courses!inner(id, name, code)`)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollErr) throw enrollErr;
      const enrollmentRows = enrollments ?? [];
      if (enrollmentRows.length === 0) return emptySummary();

      const courseIds = enrollmentRows.map((e) => e.course_id);

      // Per-course attainment in one query.
      const { data: attainment, error: attainmentErr } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent, sample_count")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");
      if (attainmentErr) throw attainmentErr;

      const courseAttainmentMap = new Map<
        string,
        { sum: number; count: number; samples: number }
      >();
      for (const row of attainment ?? []) {
        if (!row.course_id) continue;
        const cur = courseAttainmentMap.get(row.course_id) ?? {
          sum: 0,
          count: 0,
          samples: 0,
        };
        cur.sum += row.attainment_percent;
        cur.count += 1;
        cur.samples += row.sample_count ?? 0;
        courseAttainmentMap.set(row.course_id, cur);
      }

      // Count CLOs per course.
      const { data: clos, error: closErr } = await supabase
        .from("learning_outcomes")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("type", "CLO");
      if (closErr) throw closErr;

      const cloCountMap = new Map<string, number>();
      for (const row of clos ?? []) {
        if (!row.course_id) continue;
        cloCountMap.set(
          row.course_id,
          (cloCountMap.get(row.course_id) ?? 0) + 1
        );
      }

      const perCourse: CourseProgress[] = enrollmentRows.map((e) => {
        const course = e.courses;
        const att = courseAttainmentMap.get(course.id);
        const avg = att && att.count > 0 ? Math.round(att.sum / att.count) : 0;
        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          attainment_percent: avg,
          clo_count: cloCountMap.get(course.id) ?? 0,
          evidence_count: att?.samples ?? 0,
        };
      });

      const totalCourses = perCourse.length;
      const averageAttainment =
        totalCourses > 0
          ? Math.round(
              perCourse.reduce((s, c) => s + c.attainment_percent, 0) /
                totalCourses
            )
          : 0;
      const excellentCount = perCourse.filter(
        (c) => c.attainment_percent >= 85
      ).length;
      const satisfactoryCount = perCourse.filter(
        (c) => c.attainment_percent >= 70 && c.attainment_percent < 85
      ).length;
      const developingCount = perCourse.filter(
        (c) => c.attainment_percent >= 50 && c.attainment_percent < 70
      ).length;
      const notYetCount = perCourse.filter(
        (c) => c.attainment_percent < 50
      ).length;

      return {
        totalCourses,
        averageAttainment,
        excellentCount,
        satisfactoryCount,
        developingCount,
        notYetCount,
        perCourse,
      };
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

// ─── StudentAcademicSummary ──────────────────────────────────────────────────

export interface StudentAcademicSummary {
  activeCourseCount: number;
  averageMastery: number | null;
  excellentCount: number;
  satisfactoryCount: number;
  developingCount: number;
  notYetCount: number;
  strongestCourse?: {
    courseId: string;
    name: string;
    mastery: number;
  };
  weakestClo?: {
    cloId: string;
    courseId: string;
    title: string;
    mastery: number;
  };
  nextDeadline?: {
    assignmentId: string;
    title: string;
    courseName: string;
    dueAt: string;
  };
  classStanding?: {
    rank?: number;
    percentile?: number;
    cohortSize?: number;
    band?: string;
  };
  termComparison?: {
    masteryDelta?: number;
    onTimeDelta?: number;
  };
  perCourse: CourseProgress[];
}

export const useStudentAcademicSummary = (studentId: string | undefined) => {
  const progress = useStudentProgress(studentId);

  return useQuery({
    queryKey: ["student-academic-summary", studentId ?? ""],
    enabled: !!studentId && !!progress.data,
    staleTime: 60_000,
    queryFn: async (): Promise<StudentAcademicSummary> => {
      if (!studentId || !progress.data) {
        return {
          activeCourseCount: 0,
          averageMastery: null,
          excellentCount: 0,
          satisfactoryCount: 0,
          developingCount: 0,
          notYetCount: 0,
          perCourse: [],
        };
      }

      const pData = progress.data;
      const sorted = [...pData.perCourse].sort(
        (a, b) => b.attainment_percent - a.attainment_percent
      );
      const strongest = sorted[0];

      // Derive the weakest configured outcome from the same canonical
      // attainment source used by Progress. A missing row is an honest empty
      // state, not a fabricated CLO or score.
      let weakestClo: StudentAcademicSummary["weakestClo"] | undefined =
        undefined;
      const courseIds = pData.perCourse.map((c) => c.course_id);
      if (courseIds.length > 0) {
        const { data: weakestOutcome, error: weakestOutcomeError } =
          await supabase
            .from("outcome_attainment")
            .select(
              "outcome_id, course_id, attainment_percent, learning_outcomes!inner(id, title, blooms_level)"
            )
            .eq("student_id", studentId)
            .eq("scope", "student_course")
            .in("course_id", courseIds)
            .order("attainment_percent", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (weakestOutcomeError) throw weakestOutcomeError;
        const outcome = weakestOutcome?.learning_outcomes as unknown as {
          id: string;
          title: string;
          blooms_level: string | null;
        } | null;

        if (weakestOutcome?.course_id && outcome) {
          const lowestCourse = pData.perCourse.find(
            (course) => course.course_id === weakestOutcome.course_id
          );
          weakestClo = {
            cloId: outcome.id,
            courseId: weakestOutcome.course_id,
            title: outcome.title,
            mastery: weakestOutcome.attainment_percent,
          };
          if (!lowestCourse) weakestClo = undefined;
        }
      }

      // Fetch next upcoming deadline
      let nextDeadline: StudentAcademicSummary["nextDeadline"] | undefined =
        undefined;
      if (courseIds.length > 0) {
        const { data: assignData } = await supabase
          .from("assignments")
          .select("id, title, due_date, course_id")
          .in("course_id", courseIds)
          .gte("due_date", new Date().toISOString())
          .order("due_date", { ascending: true })
          .limit(1);

        if (assignData && assignData.length > 0 && assignData[0]) {
          const aRow = assignData[0];
          const matchedCourse = pData.perCourse.find(
            (c) => c.course_id === aRow.course_id
          );
          nextDeadline = {
            assignmentId: aRow.id,
            title: aRow.title,
            courseName: matchedCourse?.course_name ?? "",
            dueAt: aRow.due_date,
          };
        }
      }

      return {
        activeCourseCount: pData.totalCourses,
        averageMastery: pData.averageAttainment,
        excellentCount: pData.excellentCount,
        satisfactoryCount: pData.satisfactoryCount,
        developingCount: pData.developingCount,
        notYetCount: pData.notYetCount,
        strongestCourse: strongest
          ? {
              courseId: strongest.course_id,
              name: strongest.course_name,
              mastery: strongest.attainment_percent,
            }
          : undefined,
        weakestClo,
        nextDeadline,
        classStanding: undefined,
        termComparison: undefined,
        perCourse: pData.perCourse,
      };
    },
  });
};
