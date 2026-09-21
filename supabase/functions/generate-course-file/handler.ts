import {
  assertActor,
  assertScope,
  parseInput,
  CourseFileError,
  MAX_ROWS,
  canonicalPairs,
  assignmentSummary,
  gradeSummary,
  attainmentSummary,
  type Actor,
  type Course,
  type Program,
  type Semester,
  type Outcome,
  type Mapping,
  type Assignment,
  type Submission,
  type Grade,
  type Attainment,
  type CQI,
  type CourseFileReport,
} from "./contracts.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
interface Result {
  data: unknown;
  error: unknown;
  count?: number | null;
}
// Narrow structural port: production passes the caller-JWT Supabase client, not a service client.
export interface Query extends PromiseLike<Result> {
  eq(column: string, value: string): Query;
  in(column: string, values: string[]): Query;
  limit(count: number): Query;
  order(column: string, options?: { ascending: boolean }): Query;
  maybeSingle(): PromiseLike<Result>;
}
export interface Database {
  from(table: string): {
    select(columns: string, options?: { count: "exact" }): Query;
  };
}
export interface Dependencies {
  authenticate(
    req: Request
  ): Promise<{ user: Actor | null; error: string | null }>;
  database(req: Request): Database;
  render(report: CourseFileReport): Uint8Array;
  now(): Date;
}
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
async function single<T>(query: PromiseLike<Result>): Promise<T | null> {
  const result = await query;
  if (result.error) throw new CourseFileError("DATA_UNAVAILABLE", 503);
  return result.data as T | null;
}
async function rows<T>(query: Query): Promise<T[]> {
  const result = await query.limit(MAX_ROWS + 1);
  if (result.error) throw new CourseFileError("DATA_UNAVAILABLE", 503);
  if (!Array.isArray(result.data) || typeof result.count !== "number")
    throw new CourseFileError("DATA_UNAVAILABLE", 503);
  if (result.count > MAX_ROWS)
    throw new CourseFileError("REPORT_TOO_LARGE", 422);
  if (result.data.length !== result.count)
    throw new CourseFileError("DATA_UNAVAILABLE", 503);
  return result.data as T[];
}

export async function handleCourseFile(
  req: Request,
  deps: Dependencies
): Promise<Response> {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return json({ success: false, code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const auth = await deps.authenticate(req);
    if (auth.error) throw new CourseFileError("UNAUTHORIZED", 401);
    assertActor(auth.user);
    const actor = auth.user;
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new CourseFileError("INVALID_REQUEST", 400);
    }
    const input = parseInput(payload);
    const db = deps.database(req);
    const course = await single<Course>(
      db
        .from("courses")
        .select("id, name, code, program_id, semester_id")
        .eq("id", input.course_id)
        .maybeSingle()
    );
    if (!course) throw new CourseFileError("COURSE_UNAVAILABLE", 403);
    const program = await single<Program>(
      db
        .from("programs")
        .select("id, institution_id, coordinator_id")
        .eq("id", course.program_id)
        .eq("institution_id", actor.institution_id)
        .maybeSingle()
    );
    // Deny foreign program ownership before fetching any academic data or semester metadata.
    if (
      !program ||
      (actor.role === "coordinator" && program.coordinator_id !== actor.id)
    ) {
      throw new CourseFileError("COURSE_UNAVAILABLE", 403);
    }
    const semester = await single<Semester>(
      db
        .from("semesters")
        .select("id, name, institution_id")
        .eq("id", input.semester_id)
        .eq("institution_id", actor.institution_id)
        .maybeSingle()
    );
    assertScope(actor, input, course, program, semester);
    if (!semester) throw new CourseFileError("SEMESTER_MISMATCH", 400);

    const clos = await rows<Outcome>(
      db
        .from("learning_outcomes")
        .select("id, title, blooms_level", { count: "exact" })
        .eq("type", "CLO")
        .eq("institution_id", actor.institution_id)
        .eq("course_id", course.id)
        .order("id")
    );
    const plos = await rows<Outcome>(
      db
        .from("learning_outcomes")
        .select("id, title, blooms_level", { count: "exact" })
        .eq("type", "PLO")
        .eq("institution_id", actor.institution_id)
        .eq("program_id", program.id)
        .order("id")
    );
    const cloIds = clos.map((c) => c.id);
    const mappings =
      cloIds.length && plos.length
        ? await rows<Mapping>(
            db
              .from("outcome_mappings")
              .select("source_outcome_id, target_outcome_id, weight", {
                count: "exact",
              })
              .in("target_outcome_id", cloIds)
              .in(
                "source_outcome_id",
                plos.map((p) => p.id)
              )
              .order("source_outcome_id")
          )
        : [];
    // Assignments belong to a course offering; the offering's semester identity was checked above.
    const assignments = await rows<Assignment>(
      db
        .from("assignments")
        .select("id, title, total_marks, clo_weights", { count: "exact" })
        .eq("course_id", course.id)
        .order("id")
    );
    const submissions = assignments.length
      ? await rows<Submission>(
          db
            .from("submissions")
            .select("id, assignment_id", { count: "exact" })
            .in(
              "assignment_id",
              assignments.map((a) => a.id)
            )
            .order("id")
        )
      : [];
    const grades = submissions.length
      ? await rows<Grade>(
          db
            .from("grades")
            .select("submission_id, score_percent", { count: "exact" })
            .in(
              "submission_id",
              submissions.map((s) => s.id)
            )
            .order("submission_id")
        )
      : [];
    // Current course-scoped cache, not a semester-history table. Never fabricate term filtering.
    const attainment = cloIds.length
      ? await rows<Attainment>(
          db
            .from("outcome_attainment")
            .select(
              "outcome_id, student_id, attainment_percent, sample_count",
              { count: "exact" }
            )
            .in("outcome_id", cloIds)
            .eq("course_id", course.id)
            .eq("scope", "student_course")
            .order("id")
        )
      : [];
    const cqi = cloIds.length
      ? await rows<CQI>(
          db
            .from("cqi_action_plans")
            .select("outcome_id, action_description, root_cause, status", {
              count: "exact",
            })
            .eq("program_id", program.id)
            .eq("semester_id", semester.id)
            .eq("outcome_type", "CLO")
            .in("outcome_id", cloIds)
            .order("id")
        )
      : [];
    const titles = new Map(clos.map((c) => [c.id, c.title]));
    const generatedAt = deps.now().toISOString();
    const report: CourseFileReport = {
      course,
      semester,
      generatedAt,
      clos,
      mappings: canonicalPairs(clos, plos, mappings),
      assignments: assignmentSummary(assignments, clos),
      grades: gradeSummary(assignments, submissions, grades),
      attainment: attainmentSummary(clos, attainment),
      cqi: cqi.map((c) => ({
        label: titles.get(c.outcome_id) ?? "CLO",
        gap: c.root_cause ?? "Not recorded",
        actions: c.action_description,
        status: c.status,
      })),
    };
    // No journal_entries read: private reflections are not consented course-file evidence.
    const bytes = deps.render(report);
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
      throw new CourseFileError("REPORT_TOO_LARGE", 422);
    // Deliver only to this authorized request. Existing storage SELECT policies are not
    // program-scoped, so persisting this file would broaden coordinator access.
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return json({
      success: true,
      pdf_base64: btoa(binary),
      file_type: "pdf",
      course_name: course.name,
      course_code: course.code,
      semester: semester.name,
      generated_at: generatedAt,
      report_kind: "normalized_course_snapshot",
    });
  } catch (error) {
    // Never send DB messages, storage details, tokens or private data back to callers.
    const failure =
      error instanceof CourseFileError
        ? error
        : new CourseFileError("GENERATION_FAILED", 500);
    return json(
      { success: false, code: failure.code, error: failure.code },
      failure.status
    );
  }
}
