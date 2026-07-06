/**
 * Option J (precompute) — parity + invalidation for the get_student_dashboard
 * snapshot read-model (migration 20260821000032).
 *
 * The RPC now serves a per-student precomputed snapshot (read-through /
 * write-through cache) instead of recomputing the 8-table aggregate every call.
 * Two properties must hold, and this suite proves both against the Supabase
 * preview branch (where the migration is applied):
 *
 *   1. PARITY — a cached read returns EXACTLY the same payload as the fresh
 *      compute (no data change): call the RPC twice and assert deep-equality,
 *      plus that the caller's own data still flows through.
 *   2. INVALIDATION — a change to the student's gamification row (XP/streak/…)
 *      drops their snapshot via the AFTER trigger, so the next read reflects the
 *      change instead of serving a stale snapshot. This is what keeps
 *      gamification feedback instant despite the TTL.
 *   3. ISOLATION unchanged — the fail-closed auth guard is preserved, so another
 *      student's dashboard is still empty.
 *
 * Skip-safety (Req 19.7): wrapped in describe.skipIf(!shouldRunRls()), so with
 * no preview secrets the whole block is skipped and `npm run test:rls` exits 0.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shouldRunRls } from "./guard";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "./seed";
import { signInAs, type RoleClient } from "./signIn";

/** Minimal view of the get_student_dashboard payload this suite reads. */
interface DashboardPayload {
  kpis: {
    enrolledCourses: number;
    completedAssignments: number;
    totalXP: number;
    currentLevel: number;
  };
  deadlines: unknown[];
  announcements: unknown[];
  attendance: unknown[];
  availableXP: number;
}

const callDashboard = async (
  client: RoleClient,
  studentId: string
): Promise<DashboardPayload> => {
  const { data, error } = await client.rpc("get_student_dashboard", {
    p_student_id: studentId,
  });
  if (error) throw new Error(`get_student_dashboard failed: ${error.message}`);
  if (!data) throw new Error("get_student_dashboard returned no data");
  return data as unknown as DashboardPayload;
};

describe.skipIf(!shouldRunRls())(
  "get_student_dashboard snapshot read-model — parity + invalidation (Option J)",
  () => {
    let ctx: SeededCtx | null = null;
    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[snapshot read-model] seeded context unavailable — beforeAll did not complete."
        );
      }
      return ctx;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
      // Deterministic gamification baseline so the parity/invalidation XP
      // assertions are exact. Only student_id lacks a default, so a minimal
      // upsert is safe.
      const admin = createAdminClient();
      const { error } = await admin
        .from("student_gamification")
        .upsert(
          { student_id: ctx.studentId, xp_total: 1000 },
          { onConflict: "student_id" }
        );
      if (error) throw new Error(`seed gamification failed: ${error.message}`);
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardownRlsFixtures(ctx);
        ctx = null;
      }
    });

    it("parity: the cached read equals the fresh compute (no data change)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const first = await callDashboard(client, c.studentId); // computes + caches
        const second = await callDashboard(client, c.studentId); // served from snapshot
        expect(second).toEqual(first); // byte-for-byte parity
        // Caller's own data still flows (seed enrolls the primary student once).
        expect(first.kpis.enrolledCourses).toBe(1);
        expect(first.kpis.totalXP).toBe(1000);
      } finally {
        await client.auth.signOut();
      }
    });

    it("invalidation: a gamification change is reflected on the next read", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const before = await callDashboard(client, c.studentId); // (re)caches at 1000
        expect(before.kpis.totalXP).toBe(1000);

        // Admin bumps XP → the AFTER trigger drops this student's snapshot.
        const admin = createAdminClient();
        const { error } = await admin
          .from("student_gamification")
          .update({ xp_total: 1777 })
          .eq("student_id", c.studentId);
        if (error)
          throw new Error(`update gamification failed: ${error.message}`);

        // The snapshot was invalidated, so the RPC must recompute (not serve
        // the stale 1000).
        const after = await callDashboard(client, c.studentId);
        expect(after.kpis.totalXP).toBe(1777);
      } finally {
        await client.auth.signOut();
      }
    });

    it("isolation unchanged: another student's dashboard is empty", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const payload = await callDashboard(client, c.otherStudentId);
        expect(payload.kpis.enrolledCourses).toBe(0);
        expect(payload.deadlines).toEqual([]);
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
