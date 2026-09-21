/**
 * Feature: dashboard-and-ux-performance — Req 13 (H1 RLS permissive-policy
 * consolidation) — deny-side parity for the merged SELECT policies.
 *
 * H1 merges the multiple permissive SELECT policies on six hot tables into ONE
 * policy each. This is behavior-identical BY CONSTRUCTION: Postgres OR-combines
 * permissive policies for the same (role, cmd), so a single policy whose USING
 * clause is `pred_A OR pred_B OR …` (built from the exact same per-role
 * predicates) grants precisely the same rows as the separate policies it
 * replaces. The migrations that record each merge:
 *
 *   xp_transactions       20260821000023  ->  xp_transactions_read
 *   student_gamification  20260821000024  ->  gamification_read
 *   outcome_attainment    20260821000025  ->  attainment_read
 *   grades                20260821000026  ->  grades_read
 *   submissions           20260821000027  ->  submissions_read
 *   profiles              20260821000028  ->  profiles_read
 *   reflection_digests    20260822000002  ->  reflection_digests_read
 *
 * Those names describe historical H1 merges, not the current full policy set.
 * Phase A (20260921001942) replaces grades/submissions policies with scoped
 * history reads and actor-bound INSERTs. Preserve every read assertion below;
 * seed receipts as the enrolled student and grades as the taught-course teacher.
 * Immutable accepted receipts/grades/submit habits require retaining this owned
 * graph until the parent disposes the Git-linked PR Preview after closure.
 *
 * A SELECT RLS policy does not raise on denial — it silently filters rows — so
 * this suite asserts on the ROWS a signed-in role can read (like
 * getStudentDashboard.rls.test.ts), not on `{ error }`. For each table it proves
 * BOTH the allowed case (the permitted role sees the seeded row) AND the denied
 * case (a non-permitted authenticated user — another student, or the parent of a
 * different child, or a teacher of a course the student is not in — sees NONE of
 * them). That is the guarantee a consolidation could regress: a leak across the
 * OR-merge.
 *
 * Coverage of predicate SHAPES (every branch that appears in the six merges):
 *   - self            (student_id / id = auth.uid())      → gamification, profiles, submissions
 *   - verified parent (parent_student_links)              → gamification, attainment, submissions, grades, profiles
 *   - teacher scope   (course / assignment / enrollment)  → submissions, grades, profiles
 *   - admin / coord   (institution scope)                 → profiles (admin + coordinator branches)
 *   - submission join (grades via submissions)            → grades
 *
 * xp_transactions is intentionally NOT seeded here: it is append-only (a
 * BEFORE DELETE/UPDATE trigger `prevent_xp_transactions_mutation` raises) and
 * its FK to profiles is ON DELETE NO ACTION, so a seeded row cannot be cleaned
 * up and would wedge fixture teardown. Its merged predicate
 * (`student_id = auth.uid() OR (admin AND student_id IN <institution>)`) is the
 * simplest of the six and is the same self/admin shape exercised live on
 * student_gamification and profiles below, plus it is validated end-to-end by
 * the Supabase Preview replay of migration 20260821000023.
 *
 * Skip-safety (Req 19.7): the whole block is `describe.skipIf(!shouldRunRls())`,
 * so with no preview secrets nothing connects and `npm run test:rls` exits 0.
 * It executes for real only on the dedicated `rls-smoke` preview CI job.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shouldRunRls } from "./guard";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "./seed";
import { signInAs } from "./signIn";

/** Fixture ids created on top of the base seed graph, kept for assertions + teardown. */
interface ConsolidationFixtures {
  readonly outcomeId: string;
  readonly assignmentId: string;
  readonly submissionId: string;
  readonly gradeId: string;
  readonly reflectionDigestId: string;
}

// Registered inside the guarded seed before writes, including partial failures.
let ownedFixtures: ConsolidationFixtures | null = null;
// Set before the first receipt attempt: a lost response may hide an accepted
// receipt plus immutable submit habit, so cleanup must conservatively retain.
let retainAcademicGraph = false;

/** Minimal structural shape every `select("id")` query resolves to. */
type IdRowsResult = PromiseLike<{
  data: { id: string }[] | null;
  error: { message: string } | null;
}>;

/** Runs an `id`-selecting query and returns the visible row count (throws on error). */
const countRows = async (query: IdRowsResult): Promise<number> => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
};

/**
 * Seeds the rows read by the unchanged SELECT assertions. The guarded admin
 * client creates independent scope/attainment/digest fixtures only; ordinary
 * student/teacher JWTs produce academic receipts and grades under Phase A.
 * Only invoked inside the guarded block, never without Preview credentials.
 */
const seedConsolidationFixtures = async (
  ctx: SeededCtx
): Promise<ConsolidationFixtures> => {
  const admin = createAdminClient();
  const ids: ConsolidationFixtures = {
    outcomeId: randomUUID(),
    assignmentId: randomUUID(),
    submissionId: randomUUID(),
    gradeId: randomUUID(),
    reflectionDigestId: randomUUID(),
  };
  ownedFixtures = ids;

  // Course Learning Outcome on the seeded course (validate_sub_clo trigger
  // no-ops for a plain CLO).
  const clo = await admin
    .from("learning_outcomes")
    .insert({
      id: ids.outcomeId,
      institution_id: ctx.institutionId,
      course_id: ctx.courseId,
      title: `RLS-Consolidation CLO ${ctx.runId.slice(0, 8)}`,
      type: "CLO",
    })
    .select("id")
    .single();
  if (clo.error || !clo.data)
    throw new Error(`seed CLO failed: ${clo.error?.message}`);

  // The seeded student's attainment on that CLO (scope student_course).
  const att = await admin.from("outcome_attainment").insert({
    outcome_id: clo.data.id,
    student_id: ctx.studentId,
    course_id: ctx.courseId,
    scope: "student_course",
    attainment_percent: 82,
    sample_count: 1,
  });
  if (att.error)
    throw new Error(`seed attainment failed: ${att.error.message}`);

  // Use real per-actor sign-in helpers, not service-role academic writes or
  // forged auth.uid(). The owned teacher creates a currently open assignment.
  const teacher = await signInAs(ctx.emails.teacher, ctx.password);
  try {
    const asg = await teacher.from("assignments").insert({
      id: ids.assignmentId,
      course_id: ctx.courseId,
      created_by: ctx.teacherId,
      title: `RLS-Consolidation Assignment ${ctx.runId.slice(0, 8)}`,
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      is_late_allowed: true,
      late_window_hours: 24,
      total_marks: 100,
      clo_weights: [],
    });
    if (asg.error)
      throw new Error("Consolidation teacher assignment fixture failed");

    const student = await signInAs(ctx.emails.student, ctx.password);
    try {
      // Set BEFORE attempting the write: transport uncertainty must never lead
      // teardown to cascade-delete an accepted receipt or canonical submit habit.
      retainAcademicGraph = true;
      const sub = await student
        .from("submissions")
        .insert({
          id: ids.submissionId,
          assignment_id: ids.assignmentId,
          student_id: ctx.studentId,
          text_content: `RLS-Consolidation synthetic receipt ${ctx.runId}`,
          // Receipt timestamp/status/late flag are supplied by the server.
        })
        .select("id, assignment_id, student_id, submitted_at, is_late, status")
        .single();
      if (sub.error || !sub.data)
        throw new Error("Consolidation student receipt fixture failed");
      expect(
        sub.data.id === ids.submissionId &&
          sub.data.assignment_id === ids.assignmentId &&
          sub.data.student_id === ctx.studentId
      ).toBe(true);
      expect(sub.data.status).toBe("submitted");
      expect(sub.data.is_late).toBe(false);
      expect(
        Math.abs(Date.now() - Date.parse(sub.data.submitted_at))
      ).toBeLessThan(5 * 60_000);
    } finally {
      await student.auth.signOut();
    }

    // Real taught-course teacher attribution; retain the original unreleased
    // grade and empty CLO weights so all existing read assertions stay intact.
    const grade = await teacher
      .from("grades")
      .insert({
        id: ids.gradeId,
        submission_id: ids.submissionId,
        graded_by: ctx.teacherId,
        score_percent: 82,
        total_score: 82,
        is_released: false,
      })
      .select("submission_id, graded_by, score_percent")
      .single();
    if (grade.error || !grade.data)
      throw new Error("Consolidation teacher grade fixture failed");
    expect(
      grade.data.submission_id === ids.submissionId &&
        grade.data.graded_by === ctx.teacherId &&
        grade.data.score_percent === 82
    ).toBe(true);
  } finally {
    await teacher.auth.signOut();
  }

  // Guarantee both students have a gamification row (normally created by the
  // handle_new_user trigger; upsert is a no-op if it already exists).
  const gam = await admin
    .from("student_gamification")
    .upsert(
      [{ student_id: ctx.studentId }, { student_id: ctx.otherStudentId }],
      {
        onConflict: "student_id",
      }
    );
  if (gam.error)
    throw new Error(`seed gamification upsert failed: ${gam.error.message}`);

  // Reflection digest for the seeded student, shared with BOTH parent and
  // teacher so all three allowed branches of the merged reflection_digests_read
  // policy (20260822000002) light up. reflection_digests has no
  // prevent_mutation trigger, so teardown can delete it (unlike evidence /
  // xp_transactions).
  const digest = await admin
    .from("reflection_digests")
    .insert({
      id: ids.reflectionDigestId,
      student_id: ctx.studentId,
      month: "2025-01",
      shared_with: [{ role: "parent" }, { role: "teacher" }],
    })
    .select("id")
    .single();
  if (digest.error || !digest.data)
    throw new Error(`seed reflection_digest failed: ${digest.error?.message}`);

  return ids;
};

/**
 * Phase A accepted receipts, grades and submit habits cannot be deleted.
 * Retain their whole owned graph for parent-managed PR Preview disposal after
 * closure, including uncertain receipt outcomes. Only independent digest rows
 * are removed after that boundary; pre-receipt failures may use base teardown.
 */
const teardownConsolidationFixtures = async (ctx: SeededCtx): Promise<void> => {
  const admin = createAdminClient();
  const failures: string[] = [];
  const attempt = async (
    label: string,
    op: PromiseLike<{ error: unknown }>
  ): Promise<void> => {
    try {
      const { error } = await op;
      if (error) failures.push(label);
    } catch {
      failures.push(label);
    }
  };
  const ids = ownedFixtures;
  if (ids) {
    // Independent and mutable; exact id is known even if seed only partially ran.
    await attempt(
      "independent digest cleanup",
      admin.from("reflection_digests").delete().eq("id", ids.reflectionDigestId)
    );
  }
  if (retainAcademicGraph) {
    if (!ids) throw new Error("Consolidation retention identity unavailable");
    const ownUsers = [
      ctx.adminId,
      ctx.coordinatorId,
      ctx.teacherId,
      ctx.studentId,
      ctx.otherStudentId,
      ctx.parentId,
    ];
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
          .eq("id", ids.assignmentId),
      ],
      [
        "submissions",
        admin
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("id", ids.submissionId),
      ],
      [
        "grades",
        admin
          .from("grades")
          .select("id", { count: "exact", head: true })
          .eq("id", ids.gradeId),
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
    // Static lifecycle information and counts only; no identifiers or secrets.
    console.info(
      `[rls-consolidation Preview retention] ${diagnostics.join(
        ", "
      )}; owned academic graph retained until parent deletes the PR Preview after closure; row-level cleanup intentionally incomplete.`
    );
    // Do NOT call base teardown: its parent deletes could cascade into immutable
    // receipt/grade/habit history. Keep outcomes/attainment and related graph too.
  } else {
    if (ids) {
      await attempt(
        "pre-receipt attainment cleanup",
        admin
          .from("outcome_attainment")
          .delete()
          .eq("outcome_id", ids.outcomeId)
      );
      await attempt(
        "pre-receipt assignment cleanup",
        admin.from("assignments").delete().eq("id", ids.assignmentId)
      );
      await attempt(
        "pre-receipt outcome cleanup",
        admin.from("learning_outcomes").delete().eq("id", ids.outcomeId)
      );
    }
    await attempt(
      "owned notifications cleanup",
      admin.from("notifications").delete().eq("user_id", ctx.studentId)
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
  if (failures.length)
    throw new Error(
      `Consolidation cleanup/retention diagnostics failed: ${failures.join(
        ", "
      )}`
    );
};

describe.skipIf(!shouldRunRls())(
  "RLS — H1 SELECT-policy consolidation preserves per-role isolation (Req 13)",
  () => {
    let ctx: SeededCtx | null = null;
    let fixtures: ConsolidationFixtures | null = null;

    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[rls-consolidation] seeded context unavailable — beforeAll did not complete."
        );
      }
      return ctx;
    };
    const getFixtures = (): ConsolidationFixtures => {
      if (fixtures === null) {
        throw new Error(
          "[rls-consolidation] fixtures unavailable — beforeAll did not complete."
        );
      }
      return fixtures;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
      fixtures = await seedConsolidationFixtures(ctx);
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardownConsolidationFixtures(ctx);
        ctx = null;
        fixtures = null;
      }
    });

    // ---- profiles (profiles_read: self / admin / coordinator / teacher / parent) ----

    it("[profiles] student reads only their own profile", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.otherStudentId)
          )
        ).toBe(0);
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.teacherId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[profiles] teacher reads own + enrolled students, not an unenrolled student", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.studentId)
          )
        ).toBe(1); // enrolled in the teacher's course
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.teacherId)
          )
        ).toBe(1); // own
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.otherStudentId)
          )
        ).toBe(0); // not enrolled in any of the teacher's courses
      } finally {
        await client.auth.signOut();
      }
    });

    it("[profiles] admin reads profiles within their institution", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.admin, c.password);
      try {
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.otherStudentId)
          )
        ).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[profiles] coordinator reads profiles within their institution", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.coordinator, c.password);
      try {
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.studentId)
          )
        ).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[profiles] parent reads their linked child only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.studentId)
          )
        ).toBe(1); // verified-linked child
        expect(
          await countRows(
            client.from("profiles").select("id").eq("id", c.otherStudentId)
          )
        ).toBe(0); // not linked
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- student_gamification (gamification_read: self / staff / parent) ----

    it("[student_gamification] student reads only their own row", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("student_gamification")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("student_gamification")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[student_gamification] parent reads their linked child only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("student_gamification")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("student_gamification")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- outcome_attainment (attainment_read: self / staff / parent) ----

    it("[outcome_attainment] student reads only their own attainment", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("outcome_attainment")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        expect(
          await countRows(
            client
              .from("outcome_attainment")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[outcome_attainment] parent reads their linked child only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("outcome_attainment")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        expect(
          await countRows(
            client
              .from("outcome_attainment")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- submissions (Phase A scoped history: active owner / authorized staff / parent) ----

    it("[submissions] student reads their own submission, not another's", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1); // active owner branch of submissions_history_scoped_v1
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[submissions] teacher reads submissions for their own course only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1); // submission on an assignment in the teacher's course
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[submissions] parent reads their linked child's submission only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("submissions")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- grades (Phase A history: owner / taught-source teacher / linked parent; oversight also scoped) ----

    it("[grades] student reads the grade on their own submission", async () => {
      const c = getCtx();
      const f = getFixtures();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("grades")
              .select("id")
              .eq("submission_id", f.submissionId)
          )
        ).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[grades] a different student reads no grades at all", async () => {
      const c = getCtx();
      const f = getFixtures();
      const client = await signInAs(c.otherStudentEmail, c.password);
      try {
        // Unfiltered: RLS scopes grades to the caller's own submissions (none).
        expect(await countRows(client.from("grades").select("id"))).toBe(0);
        // Explicit deny: cannot read the seeded student's grade.
        expect(
          await countRows(
            client
              .from("grades")
              .select("id")
              .eq("submission_id", f.submissionId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[grades] teacher reads the grade for their course's submission", async () => {
      const c = getCtx();
      const f = getFixtures();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        expect(
          await countRows(
            client
              .from("grades")
              .select("id")
              .eq("submission_id", f.submissionId)
          )
        ).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[grades] parent reads the grade on their linked child's submission", async () => {
      const c = getCtx();
      const f = getFixtures();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("grades")
              .select("id")
              .eq("submission_id", f.submissionId)
          )
        ).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- reflection_digests (reflection_digests_read: self / verified-parent /
    //      enrolled-teacher). Merged by 20260822000002. The seeded digest is
    //      shared_with BOTH parent and teacher, so every allowed branch fires;
    //      the merge added NO admin/coordinator branch, so staff still read none. ----

    it("[reflection_digests] student reads only their own digest", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[reflection_digests] a different student reads none", async () => {
      const c = getCtx();
      const client = await signInAs(c.otherStudentEmail, c.password);
      try {
        // Unfiltered: the merged policy scopes to the caller's own rows (none).
        expect(
          await countRows(client.from("reflection_digests").select("id"))
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[reflection_digests] verified parent reads their linked child's shared digest only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[reflection_digests] teacher reads an enrolled student's shared digest, not an unenrolled student's", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(1);
        expect(
          await countRows(
            client
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("[reflection_digests] admin/coordinator get no direct read (merge added no staff branch)", async () => {
      const c = getCtx();
      const admin = await signInAs(c.emails.admin, c.password);
      try {
        expect(
          await countRows(
            admin
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(0);
      } finally {
        await admin.auth.signOut();
      }
      const coordinator = await signInAs(c.emails.coordinator, c.password);
      try {
        expect(
          await countRows(
            coordinator
              .from("reflection_digests")
              .select("id")
              .eq("student_id", c.studentId)
          )
        ).toBe(0);
      } finally {
        await coordinator.auth.signOut();
      }
    });
  }
);
