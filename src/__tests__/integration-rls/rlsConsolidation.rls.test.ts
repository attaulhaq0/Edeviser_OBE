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
}

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
 * Seeds the extra rows the SELECT-consolidation assertions read. Uses the
 * service-role admin client (bypasses RLS). Only invoked inside the guarded
 * block, so it never runs without preview secrets.
 */
const seedConsolidationFixtures = async (
  ctx: SeededCtx
): Promise<ConsolidationFixtures> => {
  const admin = createAdminClient();

  // Course Learning Outcome on the seeded course (validate_sub_clo trigger
  // no-ops for a plain CLO).
  const clo = await admin
    .from("learning_outcomes")
    .insert({
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

  // Assignment on the seeded course (fires trg_new_assignment_notify ->
  // emit_notification for the enrolled student; cleaned up in teardown).
  const asg = await admin
    .from("assignments")
    .insert({
      course_id: ctx.courseId,
      title: `RLS-Consolidation Assignment ${ctx.runId.slice(0, 8)}`,
      due_date: "2025-03-01T00:00:00.000Z",
      total_marks: 100,
    })
    .select("id")
    .single();
  if (asg.error || !asg.data)
    throw new Error(`seed assignment failed: ${asg.error?.message}`);

  // The seeded student's submission for that assignment.
  const sub = await admin
    .from("submissions")
    .insert({
      assignment_id: asg.data.id,
      student_id: ctx.studentId,
      status: "graded",
    })
    .select("id")
    .single();
  if (sub.error || !sub.data)
    throw new Error(`seed submission failed: ${sub.error?.message}`);

  // Teacher-recorded grade. is_released=false so trg_grade_released_notify
  // returns early (no notification), and the attainment-rollup trigger no-ops
  // on the assignment's empty clo_weights.
  const grade = await admin.from("grades").insert({
    submission_id: sub.data.id,
    graded_by: ctx.teacherId,
    score_percent: 82,
    total_score: 82,
    is_released: false,
  });
  if (grade.error) throw new Error(`seed grade failed: ${grade.error.message}`);

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

  return {
    outcomeId: clo.data.id,
    assignmentId: asg.data.id,
    submissionId: sub.data.id,
  };
};

/**
 * Deletes the extra fixture rows (child -> parent order) before delegating to
 * the base teardown. Best-effort: a delete failure only warns so the rest of
 * teardown still runs. Notifications created by the assignment insert are
 * cleared because notifications.user_id -> profiles is ON DELETE NO ACTION.
 */
const teardownConsolidationFixtures = async (ctx: SeededCtx): Promise<void> => {
  const admin = createAdminClient();
  const swallow = async (
    label: string,
    op: PromiseLike<unknown>
  ): Promise<void> => {
    try {
      await op;
    } catch (error) {
      console.warn(
        `[rls-consolidation teardown] ${label} skipped: ${String(error)}`
      );
    }
  };

  await swallow(
    "grades",
    admin.from("grades").delete().eq("graded_by", ctx.teacherId)
  );
  await swallow(
    "submissions",
    admin.from("submissions").delete().eq("student_id", ctx.studentId)
  );
  await swallow(
    "outcome_attainment",
    admin.from("outcome_attainment").delete().eq("student_id", ctx.studentId)
  );
  await swallow(
    "notifications",
    admin.from("notifications").delete().eq("user_id", ctx.studentId)
  );
  await swallow(
    "assignments",
    admin.from("assignments").delete().eq("course_id", ctx.courseId)
  );
  await swallow(
    "learning_outcomes",
    admin.from("learning_outcomes").delete().eq("course_id", ctx.courseId)
  );

  await teardownRlsFixtures(ctx);
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

    // ---- submissions (submissions_read: admin / parent / teacher; student via ALL) ----

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
        ).toBe(1); // via the untouched submissions_student_own (ALL) policy
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

    // ---- grades (grades_read: student-by-submission / teacher / parent) ----

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
  }
);
