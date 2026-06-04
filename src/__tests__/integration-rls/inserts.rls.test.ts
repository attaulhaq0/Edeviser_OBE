/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test), task 5.3
 *
 * Baseline RLS insert smoke cases for `teams` and `social_challenges`
 * (realizes part of Property 8 — RLS conformance across mutation paths/roles).
 *
 * This file ONLY declares cases and hands them to {@link runRlsCases} (built in
 * task 5.2). It reuses the existing harness verbatim — the runner, the seeded
 * context, and the per-role sign-in helper — and adds no new infrastructure.
 *
 * Cases (Req 19.3, 19.4, 19.5):
 *   1. teams              — teacher creates a team populating every NOT NULL
 *                           column (name, course_id, institution_id,
 *                           captain_id, created_by) for their own course
 *                           → success.
 *   2. social_challenges  — teacher creates a challenge with a fully
 *                           whitelisted, constraint-satisfying payload
 *                           (real columns only) → success.
 *   3. social_challenges  — STUDENT attempts to create a challenge → rejected
 *                           (the `social_challenges_insert` WITH CHECK requires
 *                           role admin/teacher).
 *
 * Skip-safety (Req 19.7): `runRlsCases` wraps the whole suite in
 * `describe.skipIf(!shouldRunRls())`, so with no preview secrets nothing
 * connects and `npm run test:rls` exits 0. The custom teardown below is only
 * ever invoked from `afterAll` inside that guarded block, so `createAdminClient`
 * is never called when the suite is skipped.
 *
 * Teardown note (FK / cleanup): `teams.course_id` and `social_challenges.course_id`
 * reference `courses(id)` WITHOUT `ON DELETE CASCADE` (verified in
 * `supabase/migrations/20260411221627_create_teams_and_social_challenges.sql`).
 * The default `teardownRlsFixtures` deletes the seeded course, which would be
 * blocked by the rows these cases insert. So the suite's teardown is wrapped to
 * delete the inserted `social_challenges`/`teams` rows (scoped to the seeded
 * course) BEFORE delegating to the default teardown. Fixtures are namespaced
 * per `runId`, so this stays best-effort and collision-free.
 */
import type { Database } from "@/types/database";
import { runRlsCases, type RLSCase } from "./runner";
import { createAdminClient, teardownRlsFixtures, type SeededCtx } from "./seed";

/** The generated insert shape for `social_challenges` (real columns only). */
type ChallengeInsert =
  Database["public"]["Tables"]["social_challenges"]["Insert"];

/**
 * Builds a constraint-satisfying `social_challenges` insert payload using only
 * Real_Columns. Shared by the teacher (success) and student (rejected) cases so
 * the ONLY difference between them is the acting role — keeping the student
 * case a clean RLS-role rejection rather than a constraint failure.
 *
 * Satisfies every live CHECK constraint:
 *   - challenge_type ∈ {academic, habit, xp_race, blooms_climb, cooperative}
 *   - participation_mode ∈ {team, individual}
 *   - status ∈ {draft, active, ended, cancelled}
 *   - goal_target > 0
 *   - reward_xp BETWEEN 50 AND 500
 *   - end_date > start_date
 */
const buildChallengePayload = (
  ctx: SeededCtx,
  createdBy: string
): ChallengeInsert => ({
  course_id: ctx.courseId,
  institution_id: ctx.institutionId,
  created_by: createdBy,
  title: `RLS Smoke Challenge ${ctx.runId.slice(0, 8)}`,
  description: "RLS smoke baseline challenge",
  challenge_type: "academic",
  participation_mode: "individual",
  goal_target: 100,
  start_date: "2025-02-01T00:00:00.000Z",
  end_date: "2025-03-01T00:00:00.000Z",
  reward_xp: 100,
  reward_badge_id: null,
  status: "draft",
});

const RLS_CASES: readonly RLSCase[] = [
  {
    table: "teams",
    description: "teacher creates a team with all required NOT NULL columns",
    asRole: "teacher",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client.from("teams").insert({
        name: `RLS Smoke Team ${ctx.runId.slice(0, 8)}`,
        course_id: ctx.courseId,
        institution_id: ctx.institutionId,
        captain_id: ctx.studentId,
        created_by: ctx.teacherId,
      });
      return { error };
    },
  },
  {
    table: "social_challenges",
    description:
      "teacher creates a challenge with a whitelisted, valid payload",
    asRole: "teacher",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client
        .from("social_challenges")
        .insert(buildChallengePayload(ctx, ctx.teacherId));
      return { error };
    },
  },
  {
    table: "social_challenges",
    description:
      "student cannot create a challenge (insert WITH CHECK requires teacher/admin)",
    asRole: "student",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client
        .from("social_challenges")
        .insert(buildChallengePayload(ctx, ctx.studentId));
      return { error };
    },
  },
];

/**
 * Removes the rows the cases above insert (scoped to the seeded course) before
 * the default teardown deletes the course — see the FK note in the file header.
 * Best-effort: a delete failure must not stop the rest of teardown from running.
 */
const teardownWithInsertedRows = async (ctx: SeededCtx): Promise<void> => {
  try {
    const admin = createAdminClient();
    await admin
      .from("social_challenges")
      .delete()
      .eq("course_id", ctx.courseId);
    await admin.from("teams").delete().eq("course_id", ctx.courseId);
  } catch (error) {
    console.warn(
      `[rls-smoke teardown] pre-clean of inserted teams/challenges skipped: ${String(
        error
      )}`
    );
  }
  await teardownRlsFixtures(ctx);
};

runRlsCases(RLS_CASES, {
  suiteName: "RLS smoke — teams & social_challenges inserts (task 5.3)",
  teardown: teardownWithInsertedRows,
});
