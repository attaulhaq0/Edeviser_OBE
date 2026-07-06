/**
 * Option J, Phase 1b — deny-side parity for the habit_logs RLS optimization.
 *
 * Migration 20260821000030 rewrites the habit_logs policies to wrap the bare
 * `auth_user_role()` / `auth_institution_id()` calls in `(select ...)` (InitPlan
 * caching) and drops `student_select_own` because it is a strict subset of the
 * still-present `users_read_own_habit_logs` (`student_id = auth.uid()`). Both
 * changes are behavior-preserving by construction, but a consolidation could
 * regress into a cross-student leak — this suite proves it does not.
 *
 * A SELECT RLS policy does not raise on denial; it silently filters rows. So,
 * like rlsConsolidation.rls.test.ts, this asserts on the ROWS each signed-in
 * role can read: BOTH the allowed case (owner / verified parent sees the row)
 * AND the denied case (a different student, or the parent of a different child,
 * sees NONE of them).
 *
 * Skip-safety (Req 19.7): the block is `describe.skipIf(!shouldRunRls())`, so
 * with no preview secrets nothing connects and `npm run test:rls` exits 0. It
 * runs for real only on the dedicated `rls-smoke` preview CI job (which has the
 * migration applied on the Supabase preview branch).
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

/** A fixed date for the seeded habit_logs (unique on student_id,habit_type,date). */
const HABIT_DATE = "2025-03-02";

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
 * Seeds one `login` habit_log for BOTH the seeded student and the other student
 * (via the service-role admin client, bypassing RLS), so the denied assertions
 * prove RLS FILTERING rather than mere absence of data.
 */
const seedHabitLogs = async (ctx: SeededCtx): Promise<void> => {
  const admin = createAdminClient();
  const rows = [
    {
      student_id: ctx.studentId,
      habit_type: "login",
      date: HABIT_DATE,
      completed_at: `${HABIT_DATE}T08:00:00.000Z`,
    },
    {
      student_id: ctx.otherStudentId,
      habit_type: "login",
      date: HABIT_DATE,
      completed_at: `${HABIT_DATE}T08:00:00.000Z`,
    },
  ];
  const { error } = await admin
    .from("habit_logs")
    .upsert(rows, { onConflict: "student_id,habit_type,date" });
  if (error) throw new Error(`seed habit_logs failed: ${error.message}`);
};

const teardownHabitLogs = async (ctx: SeededCtx): Promise<void> => {
  const admin = createAdminClient();
  try {
    await admin
      .from("habit_logs")
      .delete()
      .in("student_id", [ctx.studentId, ctx.otherStudentId]);
  } catch (error) {
    console.warn(`[habit_logs teardown] skipped: ${String(error)}`);
  }
};

describe.skipIf(!shouldRunRls())(
  "RLS — habit_logs optimization preserves per-student isolation (Option J Phase 1b)",
  () => {
    let ctx: SeededCtx | null = null;

    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[habit_logs] seeded context unavailable — beforeAll did not complete."
        );
      }
      return ctx;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
      await seedHabitLogs(ctx);
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardownHabitLogs(ctx);
        await teardownRlsFixtures(ctx);
        ctx = null;
      }
    });

    it("student reads only their own habit_logs", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBe(1);
        // Denied: another student's habit_logs are filtered out entirely.
        expect(
          await countRows(
            client
              .from("habit_logs")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("a different student cannot read the seeded student's habit_logs", async () => {
      const c = getCtx();
      const client = await signInAs(c.otherStudentEmail, c.password);
      try {
        // Sees own row (proves the consolidated own-read policy still works)...
        expect(
          await countRows(
            client
              .from("habit_logs")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(1);
        // ...but none of the seeded student's.
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("parent reads their verified-linked child's habit_logs only", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        // Denied: a child they are not linked to.
        expect(
          await countRows(
            client
              .from("habit_logs")
              .select("id")
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
