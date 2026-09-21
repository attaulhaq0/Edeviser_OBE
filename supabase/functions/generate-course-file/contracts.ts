// Framework-free production contracts. The report is a current normalized snapshot,
// not native assessment evidence, historical reconstruction or accreditation approval.
export class CourseFileError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export interface CourseFileInput {
  course_id: string;
  semester_id: string;
}
export interface Actor {
  id: string;
  role: string;
  institution_id: string;
  is_active: boolean;
}
export interface Course {
  id: string;
  name: string;
  code: string;
  program_id: string;
  semester_id: string | null;
}
export interface Program {
  id: string;
  institution_id: string;
  coordinator_id: string | null;
}
export interface Semester {
  id: string;
  name: string;
  institution_id: string;
}
export interface Outcome {
  id: string;
  title: string;
  blooms_level: string | null;
}
export interface Mapping {
  source_outcome_id: string;
  target_outcome_id: string;
  weight: number;
}
export interface Assignment {
  id: string;
  title: string;
  total_marks: number;
  clo_weights: unknown;
}
export interface Submission {
  id: string;
  assignment_id: string;
}
export interface Grade {
  submission_id: string;
  score_percent: number | null;
}
export interface Attainment {
  outcome_id: string;
  student_id: string | null;
  attainment_percent: number;
  sample_count: number;
}
export interface CQI {
  outcome_id: string;
  action_description: string;
  root_cause: string | null;
  status: string;
}

export const MAX_ROWS = 500;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseInput(value: unknown): CourseFileInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CourseFileError("INVALID_REQUEST", 400);
  const input = value as Record<string, unknown>;
  if (
    typeof input.course_id !== "string" ||
    !uuid.test(input.course_id) ||
    typeof input.semester_id !== "string" ||
    !uuid.test(input.semester_id)
  ) {
    throw new CourseFileError("INVALID_REQUEST", 400);
  }
  return { course_id: input.course_id, semester_id: input.semester_id };
}

export function assertActor(actor: Actor | null): asserts actor is Actor {
  if (!actor) throw new CourseFileError("UNAUTHORIZED", 401);
  if (
    actor.is_active !== true ||
    !actor.id ||
    !actor.institution_id ||
    !["admin", "coordinator"].includes(actor.role)
  )
    throw new CourseFileError("FORBIDDEN", 403);
}

export function assertScope(
  actor: Actor,
  input: CourseFileInput,
  course: Course | null,
  program: Program | null,
  semester: Semester | null
): void {
  assertActor(actor);
  // Same response for absent and inaccessible resources; no foreign-tenant disclosure.
  if (
    !course ||
    !program ||
    course.id !== input.course_id ||
    course.program_id !== program.id ||
    actor.institution_id !== program.institution_id ||
    (actor.role === "coordinator" && program.coordinator_id !== actor.id)
  ) {
    throw new CourseFileError("COURSE_UNAVAILABLE", 403);
  }
  if (
    !semester ||
    semester.id !== input.semester_id ||
    semester.institution_id !== actor.institution_id ||
    !course.semester_id ||
    course.semester_id !== semester.id
  )
    throw new CourseFileError("SEMESTER_MISMATCH", 400);
}

function percent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function canonicalPairs(
  clos: Outcome[],
  plos: Outcome[],
  mappings: Mapping[]
) {
  const children = new Map(clos.map((c) => [c.id, c.title]));
  const parents = new Map(plos.map((p) => [p.id, p.title]));
  return mappings
    .filter(
      (m) =>
        children.has(m.target_outcome_id) && parents.has(m.source_outcome_id)
    )
    .map((m) => {
      if (!Number.isFinite(m.weight) || m.weight < 0 || m.weight > 1)
        throw new CourseFileError("INVALID_SOURCE_DATA", 422);
      return {
        clo_title: children.get(m.target_outcome_id)!,
        plo_title: parents.get(m.source_outcome_id)!,
        weight: m.weight,
      };
    });
}

export function assignmentSummary(assignments: Assignment[], clos: Outcome[]) {
  const titles = new Map(clos.map((c) => [c.id, c.title]));
  return assignments.map((a) => ({
    title: a.title,
    total_marks: a.total_marks,
    clo_titles: (Array.isArray(a.clo_weights) ? a.clo_weights : [])
      .flatMap((entry: unknown) => {
        if (
          !entry ||
          typeof entry !== "object" ||
          !("clo_id" in entry) ||
          typeof entry.clo_id !== "string"
        )
          return [];
        const title = titles.get(entry.clo_id);
        return title ? [title] : [];
      })
      .join(", "),
  }));
}

export function gradeSummary(
  assignments: Assignment[],
  submissions: Submission[],
  grades: Grade[]
) {
  const assignmentIds = new Set(assignments.map((a) => a.id));
  const submissionMap = new Map(
    submissions
      .filter((s) => assignmentIds.has(s.assignment_id))
      .map((s) => [s.id, s.assignment_id])
  );
  const grouped = new Map<string, number[]>();
  const seen = new Set<string>();
  for (const grade of grades) {
    const id = submissionMap.get(grade.submission_id);
    if (!id || grade.score_percent === null) continue;
    if (!percent(grade.score_percent) || seen.has(grade.submission_id))
      throw new CourseFileError("INVALID_SOURCE_DATA", 422);
    seen.add(grade.submission_id);
    grouped.set(id, [...(grouped.get(id) ?? []), grade.score_percent]);
  }
  return assignments.flatMap((a) => {
    const scores = grouped.get(a.id);
    return scores?.length
      ? [
          {
            assignment_title: a.title,
            best: Math.max(...scores),
            avg: scores.reduce((sum, n) => sum + n, 0) / scores.length,
            worst: Math.min(...scores),
            count: scores.length,
          },
        ]
      : [];
  });
}

export function attainmentSummary(clos: Outcome[], rows: Attainment[]) {
  const validIds = new Set(clos.map((c) => c.id));
  const grouped = new Map<string, number[]>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (
      !validIds.has(row.outcome_id) ||
      !row.student_id ||
      row.sample_count <= 0
    )
      continue;
    const key = `${row.outcome_id}:${row.student_id}`;
    if (!percent(row.attainment_percent) || seen.has(key))
      throw new CourseFileError("INVALID_SOURCE_DATA", 422);
    seen.add(key);
    grouped.set(row.outcome_id, [
      ...(grouped.get(row.outcome_id) ?? []),
      row.attainment_percent,
    ]);
  }
  return clos.map((c) => {
    const scores = grouped.get(c.id) ?? [];
    return {
      clo_title: c.title,
      avg_percent: scores.length
        ? scores.reduce((sum, n) => sum + n, 0) / scores.length
        : null,
      count: scores.length,
    };
  });
}

export interface CourseFileReport {
  course: Course;
  semester: Semester;
  generatedAt: string;
  clos: Outcome[];
  mappings: ReturnType<typeof canonicalPairs>;
  assignments: ReturnType<typeof assignmentSummary>;
  grades: ReturnType<typeof gradeSummary>;
  attainment: ReturnType<typeof attainmentSummary>;
  cqi: Array<{ label: string; gap: string; actions: string; status: string }>;
}
