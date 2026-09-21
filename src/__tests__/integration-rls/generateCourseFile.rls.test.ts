/**
 * Bounded LIVE Preview HTTP coverage for generate-course-file, paired with the
 * Phase A submission/grade authority migration (not old PR341 schema alone).
 * Run only through vitest.integration.config.ts: its required-mode fail-closed
 * check and runRlsCases' shouldRunRls gate precede ALL clients, seeds and HTTP.
 * No mocks, service-role academic writes/report calls, or Production writes.
 * Accepted academic receipts/habits are immutable: retain the owned base graph
 * until the parent deletes the Git-linked PR Preview after closure. No reset.
 * This proves only the current English normalized snapshot, not launch readiness.
 */
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import {
  courseFileInvocationError,
  parseCourseFileResponse,
} from "@/lib/courseFile";
import { readRlsEnv } from "@/__tests__/integration-rls/guard";
import { runRlsCases, type RLSCase } from "@/__tests__/integration-rls/runner";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "@/__tests__/integration-rls/seed";
import { signInAs, type RoleClient } from "@/__tests__/integration-rls/signIn";

type Input = { course_id: string; semester_id: string };
type Result = { error: unknown };
interface Extras {
  foreignInstitution: string;
  foreignProgram: string;
  foreignSemester: string;
  foreignCourse: string;
  unassignedProgram: string;
  unassignedCourse: string;
  otherSemester: string;
  assignment: string;
  submission: string;
  grade: string;
}
let extras: Extras | undefined;
// Set before the first receipt attempt: a transport failure may hide a commit.
// Never risk cascading deletion of accepted receipts or immutable submit habits.
let retainAcademicGraph = false;
const getExtras = (): Extras => {
  if (!extras) throw new Error("Course-file fixture setup did not complete");
  return extras;
};
const inputFor = (ctx: SeededCtx): Input => ({
  course_id: ctx.courseId,
  semester_id: ctx.semesterId,
});
const assignmentTitle = (ctx: SeededCtx): string =>
  `CF-${ctx.runId.slice(0, 8)}`;

// Never include raw SDK errors, response bodies, clients or credentials in failures.
async function mustWrite(op: PromiseLike<Result>, step: string): Promise<void> {
  try {
    const result = await op;
    if (!result.error) return;
  } catch {
    // SDK transport exceptions are also replaced with a credential-free step.
  }
  throw new Error(`Course-file fixture ${step} failed`);
}

async function cleanup(ctx: SeededCtx): Promise<void> {
  const admin = createAdminClient();
  const failures: string[] = [];
  const attempt = async (label: string, op: PromiseLike<Result>) => {
    try {
      await mustWrite(op, label);
    } catch {
      failures.push(label);
    }
  };
  if (extras) {
    const e = extras;
    // Supplemental nonacademic scope rows have no accepted receipts. All delete
    // predicates are exact owned ids. Never DELETE grades/submissions/habits.
    if (!retainAcademicGraph) {
      await attempt(
        "pre-receipt assignment cleanup",
        admin.from("assignments").delete().eq("id", e.assignment)
      );
    }
    await attempt(
      "extra courses cleanup",
      admin
        .from("courses")
        .delete()
        .in("id", [e.foreignCourse, e.unassignedCourse])
    );
    await attempt(
      "extra semesters cleanup",
      admin
        .from("semesters")
        .delete()
        .in("id", [e.foreignSemester, e.otherSemester])
    );
    await attempt(
      "extra programs cleanup",
      admin
        .from("programs")
        .delete()
        .in("id", [e.foreignProgram, e.unassignedProgram])
    );
    await attempt(
      "foreign institution cleanup",
      admin.from("institutions").delete().eq("id", e.foreignInstitution)
    );
  }
  const ownUsers = [
    ctx.adminId,
    ctx.coordinatorId,
    ctx.teacherId,
    ctx.studentId,
    ctx.otherStudentId,
    ctx.parentId,
  ];
  if (retainAcademicGraph) {
    // Phase A protects accepted receipts, grades and submit habits even from
    // service-role deletion. Keep their base tenant/users/course and dependent
    // graph intact, rather than call a base teardown that would cascade into it.
    // Parent owns branch-lifetime disposal after PR closure, not row-level reset.
    const e = getExtras();
    const retainedCounts = [
      [
        "institutions",
        admin
          .from("institutions")
          .select("id", { count: "exact", head: true })
          .eq("id", ctx.institutionId),
      ],
      [
        "profiles",
        admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("id", ownUsers),
      ],
      [
        "assignments",
        admin
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("id", e.assignment),
      ],
      [
        "submissions",
        admin
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("id", e.submission),
      ],
      [
        "grades",
        admin
          .from("grades")
          .select("id", { count: "exact", head: true })
          .eq("id", e.grade),
      ],
      [
        "submit_habits",
        admin
          .from("habit_logs")
          .select("id", { count: "exact", head: true })
          .eq("student_id", ctx.studentId)
          .eq("habit_type", "submit"),
      ],
    ] as const;
    const diagnostics: string[] = [];
    for (const [label, query] of retainedCounts) {
      try {
        const { count, error } = await query;
        if (error || count === null)
          throw new Error("Retention count unavailable");
        diagnostics.push(`${label}=${count}`);
      } catch {
        diagnostics.push(`${label}=unknown`);
        failures.push("owned retention count unavailable");
      }
    }
    // Counts and static lifecycle information only: no ids/emails/JWTs/content.
    console.info(
      `[course-file Preview retention] ${diagnostics.join(
        ", "
      )}; owned academic graph retained until parent deletes the PR Preview after closure; row-level cleanup intentionally incomplete.`
    );
  } else {
    // Before any receipt attempt, normal helper teardown remains legal. Only
    // helper-created recipients' assignment notifications may need removal.
    await attempt(
      "owned notifications cleanup",
      admin.from("notifications").delete().in("user_id", ownUsers)
    );
    try {
      await teardownRlsFixtures(ctx);
    } catch {
      failures.push("base fixture cleanup");
    }
    const remaining = await admin
      .from("institutions")
      .select("id")
      .eq("id", ctx.institutionId);
    if (remaining.error || remaining.data?.length !== 0)
      failures.push("residual pre-receipt tenant");
  }
  if (extras) {
    const remaining = await admin
      .from("institutions")
      .select("id")
      .eq("id", extras.foreignInstitution);
    if (remaining.error || remaining.data?.length !== 0)
      failures.push("residual supplemental tenant");
  }
  if (failures.length)
    throw new Error(
      `Course-file cleanup/retention diagnostics failed: ${failures.join(", ")}`
    );
}

async function seed(): Promise<SeededCtx> {
  const ctx = await seedRlsFixtures();
  // IDs are registered BEFORE writes so supplemental partial failures can be
  // cleaned even if an insert succeeds but its response is interrupted.
  extras = {
    foreignInstitution: randomUUID(),
    foreignProgram: randomUUID(),
    foreignSemester: randomUUID(),
    foreignCourse: randomUUID(),
    unassignedProgram: randomUUID(),
    unassignedCourse: randomUUID(),
    otherSemester: randomUUID(),
    assignment: randomUUID(),
    submission: randomUUID(),
    grade: randomUUID(),
  };
  const e = extras;
  try {
    const admin = createAdminClient();
    await mustWrite(
      admin.from("institutions").insert({
        id: e.foreignInstitution,
        name: `CF foreign ${ctx.runId}`,
        slug: `cf-foreign-${ctx.runId}`,
        join_mode: "open",
      }),
      "foreign institution"
    );
    await mustWrite(
      admin.from("programs").insert([
        {
          id: e.foreignProgram,
          name: `CF foreign ${ctx.runId}`,
          code: `CF-F-${ctx.runId.slice(0, 8)}`,
          institution_id: e.foreignInstitution,
        },
        {
          id: e.unassignedProgram,
          name: `CF unassigned ${ctx.runId}`,
          code: `CF-U-${ctx.runId.slice(0, 8)}`,
          institution_id: ctx.institutionId,
          coordinator_id: null,
        },
      ]),
      "scope programs"
    );
    await mustWrite(
      admin.from("semesters").insert([
        {
          id: e.foreignSemester,
          name: `CF foreign term ${ctx.runId}`,
          code: `CF-FS-${ctx.runId.slice(0, 8)}`,
          institution_id: e.foreignInstitution,
          start_date: "2025-01-01",
          end_date: "2025-06-30",
        },
        {
          id: e.otherSemester,
          name: `CF other term ${ctx.runId}`,
          code: `CF-OS-${ctx.runId.slice(0, 8)}`,
          institution_id: ctx.institutionId,
          start_date: "2025-07-01",
          end_date: "2025-12-31",
        },
      ]),
      "scope semesters"
    );
    await mustWrite(
      admin.from("courses").insert([
        {
          id: e.foreignCourse,
          name: `CF foreign course ${ctx.runId}`,
          code: `CF-FC-${ctx.runId.slice(0, 8)}`,
          program_id: e.foreignProgram,
          semester_id: e.foreignSemester,
          academic_year: "2025",
          semester: "Spring 2025",
        },
        {
          id: e.unassignedCourse,
          name: `CF unassigned course ${ctx.runId}`,
          code: `CF-UC-${ctx.runId.slice(0, 8)}`,
          program_id: e.unassignedProgram,
          semester_id: ctx.semesterId,
          academic_year: "2025",
          semester: "Spring 2025",
          teacher_id: ctx.teacherId,
        },
      ]),
      "scope courses"
    );
    // Real ordinary actor writes under the paired Phase A authority guards.
    // Service-role/no-auth.uid receipts and grades are deliberately NOT legal.
    // No academic data is created in B; no JWT claims or policies are spoofed.
    const teacher = await signInAs(ctx.emails.teacher, ctx.password);
    try {
      await mustWrite(
        teacher.from("assignments").insert({
          id: e.assignment,
          course_id: ctx.courseId,
          created_by: ctx.teacherId,
          title: assignmentTitle(ctx),
          type: "assignment",
          total_marks: 100,
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          is_late_allowed: true,
          late_window_hours: 24,
          clo_weights: [],
        }),
        "teacher assignment"
      );
      const student = await signInAs(ctx.emails.student, ctx.password);
      try {
        // An accepted receipt also creates an immutable canonical submit habit.
        // Retain conservatively even if the response is lost after commit.
        retainAcademicGraph = true;
        const receipt = await student
          .from("submissions")
          .insert({
            id: e.submission,
            assignment_id: e.assignment,
            student_id: ctx.studentId,
            text_content: `CF synthetic ${ctx.runId}`,
            // Receipt timestamp, late flag and status belong to the server.
          })
          .select(
            "id, assignment_id, student_id, submitted_at, is_late, status"
          )
          .single();
        if (receipt.error || !receipt.data)
          throw new Error("Course-file fixture student receipt failed");
        expect(
          receipt.data.id === e.submission &&
            receipt.data.assignment_id === e.assignment &&
            receipt.data.student_id === ctx.studentId
        ).toBe(true);
        expect(receipt.data.status).toBe("submitted");
        expect(receipt.data.is_late).toBe(false);
        expect(
          Math.abs(Date.now() - Date.parse(receipt.data.submitted_at))
        ).toBeLessThan(5 * 60_000);
      } finally {
        await student.auth.signOut();
      }
      // Unreleased grades are explicitly included by the course-file contract.
      // Empty CLO weights keep this bounded to grade/report evidence, not OBE.
      await mustWrite(
        teacher.from("grades").insert({
          id: e.grade,
          submission_id: e.submission,
          graded_by: ctx.teacherId,
          score_percent: 82,
          total_score: 82,
          rubric_selections: [],
          is_released: false,
        }),
        "teacher grade"
      );
      // Read actual persisted source/attribution/score through the teacher JWT.
      const grade = await teacher
        .from("grades")
        .select("submission_id, graded_by, score_percent")
        .eq("id", e.grade)
        .single();
      if (
        grade.error ||
        grade.data?.submission_id !== e.submission ||
        grade.data.graded_by !== ctx.teacherId ||
        grade.data.score_percent !== 82
      ) {
        throw new Error("Course-file fixture academic readback failed");
      }
    } finally {
      await teacher.auth.signOut();
    }
    return ctx;
  } catch (error) {
    // runner has no ctx if custom seed rejects: own the supplemental unwind here.
    await cleanup(ctx);
    if (
      error instanceof Error &&
      error.message.startsWith("Course-file fixture ")
    )
      throw error;
    throw new Error(
      "Course-file supplemental fixture setup failed; no guard bypass attempted"
    );
  }
}

async function bearer(client: RoleClient): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error("Course-file Preview actor session unavailable");
  return `Bearer ${data.session.access_token}`;
}

async function invoke(input: Input, authorization?: string): Promise<Response> {
  const env = readRlsEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey)
    throw new Error("Course-file Preview configuration unavailable");
  // Anon key is the gateway API key, NEVER the service-role fixture key.
  // One request per case, no retries or redirects to a different target.
  try {
    return await fetch(`${env.supabaseUrl}/functions/v1/generate-course-file`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: {
        apikey: env.supabaseAnonKey,
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(
      "Course-file HTTP request failed or exceeded its bounded timeout"
    );
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Course-file response must be a JSON object");
  return value as Record<string, unknown>;
}
async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  expect(
    response.headers.get("content-type")?.includes("application/json")
  ).toBe(true);
  try {
    return asObject(await response.json());
  } catch {
    throw new Error("Course-file response was not valid JSON");
  }
}

async function assertDenied(
  response: Response,
  status: number,
  code: string,
  gatewayAllowed = false
): Promise<void> {
  expect(response.status).toBe(status);
  const payload = await jsonBody(response);
  if (gatewayAllowed && payload.success === undefined) {
    // Missing/invalid JWT may be rejected by Supabase's gateway before handler.
    expect(
      Object.keys(payload).every((key) =>
        ["code", "message", "error"].includes(key)
      )
    ).toBe(true);
    const mapped = await courseFileInvocationError(
      { context: response },
      payload
    );
    expect(mapped.code).toBe("UNAUTHORIZED");
  } else {
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Object.keys(payload).sort()).toEqual(["code", "error", "success"]);
    expect(
      payload.success === false &&
        payload.code === code &&
        payload.error === code
    ).toBe(true);
  }
}

async function assertPdf(response: Response, ctx: SeededCtx): Promise<void> {
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const payload = await jsonBody(response);
  expect(Object.keys(payload).sort()).toEqual([
    "course_code",
    "course_name",
    "file_type",
    "generated_at",
    "pdf_base64",
    "report_kind",
    "semester",
    "success",
  ]);
  // Same strict production response/base64/PDF contract used by the UI.
  const { metadata, blob } = parseCourseFileResponse(payload);
  expect(metadata).toEqual({
    success: true,
    file_type: "pdf",
    report_kind: "normalized_course_snapshot",
    course_name: `RLS Smoke Course ${ctx.runId}`,
    course_code: `RLS-C-${ctx.runId.slice(0, 8)}`,
    semester: `RLS Smoke Semester ${ctx.runId}`,
    generated_at: metadata.generated_at,
  });
  expect(Math.abs(Date.now() - Date.parse(metadata.generated_at))).toBeLessThan(
    5 * 60_000
  );
  expect(blob.type).toBe("application/pdf");
  expect(blob.size).toBeGreaterThan(1000);
  expect(blob.size).toBeLessThanOrEqual(5 * 1024 * 1024);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const pdf = bytes.toString("latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect(/\/Type\s*\/Page\b/.test(pdf)).toBe(true);
  expect(/trailer\s*<<[\s\S]*\/Root\s+\d+\s+0\s+R/.test(pdf)).toBe(true);
  const xref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(pdf);
  expect(xref !== null).toBe(true);
  expect(pdf.slice(Number(xref?.[1]), Number(xref?.[1]) + 4)).toBe("xref");
  // Current pdf.ts uses uncompressed jsPDF literal Tj text. This deliberately
  // narrow extractor is NOT a general PDF parser; a renderer change must update
  // this contract. Inspect actual HTTP bytes, never call/mock the local renderer.
  const text = Array.from(
    pdf.matchAll(/\(((?:\\[\s\S]|[^\\()])*)\)\s*Tj/g),
    (match) => (match[1] ?? "").replace(/\\([\\()])/g, "$1")
  );
  expect(text.includes("Course File - Normalized Snapshot")).toBe(true);
  const cells = text.join("|");
  expect(cells.includes(`${assignmentTitle(ctx)}|100|Not recorded`)).toBe(true);
  // The key regression: caller-JWT RLS must not silently hide the seeded grade
  // and return a plausible-but-empty PDF to admin/assigned coordinator.
  expect(
    cells.includes(`${assignmentTitle(ctx)}|1|82.0|82.0|82.0`),
    "PDF must contain the persisted normalized grade: count=1, highest/mean/lowest=82.0"
  ).toBe(true);
  expect(cells.includes("CF foreign")).toBe(false);
}

const cases: RLSCase[] = [];
function addCase(
  description: string,
  asRole: RLSCase["asRole"],
  action: (ctx: SeededCtx, client: RoleClient) => Promise<void>
): void {
  cases.push({
    table: "generate-course-file HTTP",
    description,
    asRole,
    // HTTP assertions above are authoritative, rather than the runner's generic
    // truthy-error test (which could mistake a 500/schema failure for a denial).
    expect: "success",
    action: async (ctx, client) => {
      await action(ctx, client);
      return { error: null };
    },
  });
}
for (const role of ["admin", "coordinator"] as const) {
  addCase(
    "returns actual PDF bytes, exact metadata and nonempty academic statistics",
    role,
    async (ctx, client) => {
      await assertPdf(await invoke(inputFor(ctx), await bearer(client)), ctx);
    }
  );
  addCase(
    "denies a foreign tenant's course and matching foreign semester",
    role,
    async (_ctx, client) => {
      const e = getExtras();
      await assertDenied(
        await invoke(
          { course_id: e.foreignCourse, semester_id: e.foreignSemester },
          await bearer(client)
        ),
        403,
        "COURSE_UNAVAILABLE"
      );
    }
  );
  for (const semester of ["foreignSemester", "otherSemester"] as const) {
    addCase(`denies own course with ${semester}`, role, async (ctx, client) => {
      await assertDenied(
        await invoke(
          { ...inputFor(ctx), semester_id: getExtras()[semester] },
          await bearer(client)
        ),
        400,
        "SEMESTER_MISMATCH"
      );
    });
  }
}
for (const role of ["teacher", "student", "parent"] as const) {
  addCase(
    "denies report even for own taught/enrolled/verified-child course",
    role,
    async (ctx, client) => {
      await assertDenied(
        await invoke(inputFor(ctx), await bearer(client)),
        403,
        "FORBIDDEN"
      );
    }
  );
}
addCase(
  "denies a same-tenant course outside assigned program",
  "coordinator",
  async (ctx, client) => {
    await assertDenied(
      await invoke(
        { ...inputFor(ctx), course_id: getExtras().unassignedCourse },
        await bearer(client)
      ),
      403,
      "COURSE_UNAVAILABLE"
    );
  }
);
addCase(
  "rechecks inactive CURRENT profile after sign-in",
  "admin",
  async (ctx, client) => {
    const authorization = await bearer(client);
    const admin = createAdminClient();
    try {
      await mustWrite(
        admin
          .from("profiles")
          .update({ is_active: false })
          .eq("id", ctx.adminId)
          .eq("institution_id", ctx.institutionId),
        "deactivate own admin"
      );
      // _shared/auth.ts rejects inactive profiles with auth.error, hence 401
      // UNAUTHORIZED (not the pure assertActor contract's synthetic 403).
      await assertDenied(
        await invoke(inputFor(ctx), authorization),
        401,
        "UNAUTHORIZED"
      );
    } finally {
      await mustWrite(
        admin
          .from("profiles")
          .update({ is_active: true })
          .eq("id", ctx.adminId)
          .eq("institution_id", ctx.institutionId),
        "restore own admin"
      );
    }
  }
);
for (const authorization of [
  undefined,
  "Bearer course-file-deliberately-invalid-jwt",
]) {
  addCase(
    authorization
      ? "denies invalid authentication"
      : "denies missing authentication",
    "admin",
    async (ctx) => {
      await assertDenied(
        await invoke(inputFor(ctx), authorization),
        401,
        "UNAUTHORIZED",
        true
      );
    }
  );
}

// Reuses production guard, base seed and fresh signIn/signOut per case. Custom
// teardown preserves the explicit branch-lifetime retention boundary above.
// No client construction occurs in module/describe scope.
runRlsCases(cases, {
  suiteName: "LIVE Preview course-file HTTP authorization and PDF",
  seed,
  teardown: cleanup,
});
