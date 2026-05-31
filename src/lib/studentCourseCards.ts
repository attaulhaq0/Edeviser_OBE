/**
 * Pure aggregation logic for student course cards.
 *
 * Kept free of React and Supabase so it can be unit-tested directly and reused
 * by `useStudentCourses`. The hook performs a fixed, small number of batched
 * queries and hands the raw rows to {@link buildCourseCards}, which merges them
 * in memory — there is no per-card (N+1) fetching.
 *
 * Satisfies Requirements 9.1, 9.2, 9.2a, 9.4, 9.5.
 */

export interface CourseCardCourse {
  id: string;
  name: string;
  code: string;
  color: string | null;
  teacher_name: string | null;
}

export interface CourseCardEnrollment {
  course_id: string;
  course: CourseCardCourse;
}

export interface CourseCardAttainmentRow {
  course_id: string | null;
  attainment_percent: number;
}

export interface CourseCardAssignmentRow {
  id: string;
  course_id: string | null;
  title: string;
  /** `due_date` is non-null in the schema, but modelled nullable for R9.2a. */
  due_date: string | null;
}

export interface NextAssignment {
  title: string;
  due_at: string | null;
}

export interface EnrolledCourseCard {
  id: string;
  name: string;
  code: string;
  teacher_name: string | null;
  /** Average course-scoped attainment, or null when no evidence exists. */
  attainment_percent: number | null;
  /** Completed-vs-total assignment progress, 0–100. */
  progress_percent: number;
  /** Earliest upcoming assignment, or null when there is no upcoming work. */
  next_assignment: NextAssignment | null;
  /** Course color identifier, or null when unassigned. */
  color: string | null;
  /** Total assignments in the course. */
  assignments_count: number;
}

export interface BuildCourseCardsInput {
  enrollments: CourseCardEnrollment[];
  attainmentRows: CourseCardAttainmentRow[];
  assignmentRows: CourseCardAssignmentRow[];
  /** Assignment ids for which the student has a completed (graded) submission. */
  completedAssignmentIds: ReadonlySet<string>;
  /** Reference "now" used to determine which assignments are upcoming. */
  now: Date;
}

const roundPercent = (value: number): number => Math.round(value);

/**
 * Merge batched query rows into per-course card view models.
 *
 * - `attainment_percent` is the mean of all course-scoped attainment rows for
 *   the course, or null when none exist.
 * - `progress_percent` is completed (graded) assignments over total assignments.
 * - `next_assignment` is the earliest assignment whose `due_date` is at or after
 *   `now`; assignments without a due date are still surfaced (R9.2a) but ordered
 *   after dated ones so a concrete deadline is preferred.
 * - `assignments_count` is the total number of assignments for the course.
 */
export function buildCourseCards(
  input: BuildCourseCardsInput
): EnrolledCourseCard[] {
  const {
    enrollments,
    attainmentRows,
    assignmentRows,
    completedAssignmentIds,
    now,
  } = input;

  const attainmentByCourse = new Map<string, number[]>();
  for (const row of attainmentRows) {
    if (!row.course_id) continue;
    const arr = attainmentByCourse.get(row.course_id) ?? [];
    arr.push(row.attainment_percent);
    attainmentByCourse.set(row.course_id, arr);
  }

  const assignmentsByCourse = new Map<string, CourseCardAssignmentRow[]>();
  for (const row of assignmentRows) {
    if (!row.course_id) continue;
    const arr = assignmentsByCourse.get(row.course_id) ?? [];
    arr.push(row);
    assignmentsByCourse.set(row.course_id, arr);
  }

  const nowMs = now.getTime();

  return enrollments.map((enrollment) => {
    const course = enrollment.course;

    const attainmentVals = attainmentByCourse.get(course.id) ?? [];
    const attainment_percent =
      attainmentVals.length > 0
        ? roundPercent(
            attainmentVals.reduce((sum, v) => sum + v, 0) /
              attainmentVals.length
          )
        : null;

    const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
    const assignments_count = courseAssignments.length;

    const completedCount = courseAssignments.reduce(
      (count, a) => (completedAssignmentIds.has(a.id) ? count + 1 : count),
      0
    );
    const progress_percent =
      assignments_count > 0
        ? roundPercent((completedCount / assignments_count) * 100)
        : 0;

    const next_assignment = selectNextAssignment(courseAssignments, nowMs);

    return {
      id: course.id,
      name: course.name,
      code: course.code,
      teacher_name: course.teacher_name,
      attainment_percent,
      progress_percent,
      next_assignment,
      color: course.color,
      assignments_count,
    };
  });
}

/**
 * Pick the earliest upcoming assignment for a course. Assignments with a due
 * date at or after `nowMs` are preferred and ordered by due date ascending;
 * those without a due date are returned only when no dated upcoming work exists.
 */
function selectNextAssignment(
  assignments: CourseCardAssignmentRow[],
  nowMs: number
): NextAssignment | null {
  let earliestDated: CourseCardAssignmentRow | null = null;
  let earliestDatedMs = Number.POSITIVE_INFINITY;
  let undatedFallback: CourseCardAssignmentRow | null = null;

  for (const assignment of assignments) {
    if (assignment.due_date == null) {
      undatedFallback ??= assignment;
      continue;
    }
    const dueMs = new Date(assignment.due_date).getTime();
    if (Number.isNaN(dueMs)) {
      undatedFallback ??= assignment;
      continue;
    }
    if (dueMs >= nowMs && dueMs < earliestDatedMs) {
      earliestDated = assignment;
      earliestDatedMs = dueMs;
    }
  }

  const chosen = earliestDated ?? undatedFallback;
  if (!chosen) return null;
  return { title: chosen.title, due_at: chosen.due_date };
}
