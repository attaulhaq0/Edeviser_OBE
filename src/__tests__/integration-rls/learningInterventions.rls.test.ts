/**
 * Feature: QA Round 2026-09-02 (V6) — RLS smoke for `learning_interventions`.
 *
 * The intervention loop lets teachers record follow-ups from triage. The
 * `learning_interventions_insert` policy (migration
 * `20260902180000_learning_interventions_teacher_write_policies`) requires a
 * real teaching/coordinating relationship, mirroring the SELECT policy.
 *
 * Cases:
 *   1. teacher records an intervention for a student in their own course →
 *      success.
 *   2. student attempts to record an intervention → rejected.
 *   3. teacher cannot forge institution_id for an owned course → rejected.
 *
 * Skip-safety: `runRlsCases` wraps the suite in `describe.skipIf(!shouldRunRls())`.
 *
 * Teardown: `learning_interventions.course_id` references `courses(id)` without
 * cascade, so inserted rows are deleted (scoped to the seeded course) before
 * the default teardown deletes the course.
 */
import { runRlsCases, type RLSCase } from "./runner";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "./seed";

const buildInterventionPayload = (ctx: SeededCtx, createdBy: string) => ({
  institution_id: ctx.institutionId,
  student_id: ctx.studentId,
  course_id: ctx.courseId,
  intervention_type: "nudge",
  payload: { message: "RLS smoke follow-up", channel: "notification" },
  source: "teacher",
  status: "active",
  created_by: createdBy,
  started_at: new Date().toISOString(),
});

const RLS_CASES: readonly RLSCase[] = [
  {
    table: "learning_interventions",
    description:
      "teacher records a follow-up for a student in their own course",
    asRole: "teacher",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client
        .from("learning_interventions")
        .insert(buildInterventionPayload(ctx, ctx.teacherId));
      return { error };
    },
  },
  {
    table: "learning_interventions",
    description:
      "student cannot record an intervention (insert policy requires staff relationship)",
    asRole: "student",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client
        .from("learning_interventions")
        .insert(buildInterventionPayload(ctx, ctx.studentId));
      return { error };
    },
  },
  {
    table: "learning_interventions",
    description: "teacher cannot forge institution_id for an owned course",
    asRole: "teacher",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client.from("learning_interventions").insert({
        ...buildInterventionPayload(ctx, ctx.teacherId),
        institution_id: "00000000-0000-4000-8000-000000000000",
      });
      return { error };
    },
  },
];

/**
 * Removes rows the cases insert (scoped to the seeded course) before the
 * default teardown deletes the course. Best-effort.
 */
const teardownWithInsertedRows = async (ctx: SeededCtx): Promise<void> => {
  try {
    const admin = createAdminClient();
    await admin
      .from("learning_interventions")
      .delete()
      .eq("course_id", ctx.courseId);
  } catch (error) {
    console.warn(
      `[rls-smoke teardown] pre-clean of learning_interventions skipped: ${String(
        error
      )}`
    );
  }
  await teardownRlsFixtures(ctx);
};

runRlsCases(RLS_CASES, {
  suiteName: "RLS smoke — learning_interventions insert policies (QA V6)",
  seed: seedRlsFixtures,
  teardown: teardownWithInsertedRows,
});
