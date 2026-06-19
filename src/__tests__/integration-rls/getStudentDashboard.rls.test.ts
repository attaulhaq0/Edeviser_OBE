/**
 * Feature: dashboard-and-ux-performance — Req 2 (per-role dashboard aggregate
 * RPC), task 2.7 — RLS data-leakage assertion for `get_student_dashboard`.
 *
 * `get_student_dashboard(p_student_id uuid)` is `SECURITY INVOKER`, so every
 * underlying read is RLS-checked as the CALLER. The guarantee we must prove is
 * therefore a DATA guarantee, not an error guarantee: a student calling the RPC
 * with ANOTHER student's id does NOT raise — it simply returns the rows their
 * own RLS permits, which for another student's scoped tables is none. So the
 * success/rejected `runRlsCases` runner (which only inspects `{ error }`) cannot
 * express this; this file calls the RPC directly and asserts on the returned
 * payload instead.
 *
 * Matrix (uses only the seed graph: the primary student is enrolled in exactly
 * one seeded course; `otherStudentId` is enrolled in none):
 *   1. student A → get_student_dashboard(A)      → own data flows through
 *      (`kpis.enrolledCourses === 1`).
 *   2. student A → get_student_dashboard(B)      → NO leakage of B's data
 *      (`enrolledCourses === 0`, and `deadlines`/`announcements`/`attendance`
 *      all empty) — the core anti-leakage assertion.
 *   3. student B → get_student_dashboard(A)      → symmetric: A's data is
 *      invisible to B (`enrolledCourses === 0`).
 *
 * Skip-safety (Req 19.7): wrapped in `describe.skipIf(!shouldRunRls())`, so with
 * no preview secrets the whole block — including seed/teardown — is skipped and
 * `npm run test:rls` exits 0. The RPC already exists (migration
 * `20260821000006_create_get_student_dashboard_rpc.sql`), so unlike the
 * red-first nudge smoke test this suite is GREEN on the `rls-smoke` preview job.
 *
 * Typing note: `get_student_dashboard` is not in the generated `Database` types
 * yet (task 2.2), so a direct `client.rpc("get_student_dashboard", …)` would not
 * type-check. Per the repo precedent (`nudge.rls.test.ts`) we cast ONLY the
 * `rpc` surface — never `any`, and never a `.from/.insert/.update/.upsert(… as
 * never)` builder cast — so the Static_Cast_Guard stays green. Remove the shim
 * once the RPC is added to the generated types.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shouldRunRls } from "./guard";
import { seedRlsFixtures, teardownRlsFixtures, type SeededCtx } from "./seed";
import { signInAs, type RoleClient } from "./signIn";

/** Minimal view of the `get_student_dashboard` jsonb payload this test reads. */
interface DashboardPayload {
  kpis: { enrolledCourses: number; completedAssignments: number };
  deadlines: unknown[];
  announcements: unknown[];
  attendance: unknown[];
}

/** Loose `{ data, error }` shape for an RPC not yet in the generated types. */
interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}
type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>
) => Promise<RpcResult>;

/**
 * Calls `get_student_dashboard` as the given (already-authenticated) client and
 * returns the parsed payload. Casts ONLY the `rpc` method (repo precedent), so
 * the Static_Cast_Guard stays green.
 */
const callDashboardRpc = async (
  client: RoleClient,
  studentId: string
): Promise<DashboardPayload> => {
  const rpc = client.rpc as unknown as UntypedRpc;
  const { data, error } = await rpc("get_student_dashboard", {
    p_student_id: studentId,
  });
  if (error) {
    throw new Error(
      `get_student_dashboard failed: ${error.message ?? String(error)}`
    );
  }
  if (!data) {
    throw new Error("get_student_dashboard returned no data");
  }
  return data as DashboardPayload;
};

describe.skipIf(!shouldRunRls())(
  "RLS — get_student_dashboard is SECURITY INVOKER (no cross-student leakage) (task 2.7)",
  () => {
    let ctx: SeededCtx | null = null;
    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[rls-smoke get_student_dashboard] seeded context unavailable — beforeAll seeding did not complete."
        );
      }
      return ctx;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
    });

    afterAll(async () => {
      if (ctx !== null) {
        await teardownRlsFixtures(ctx);
        ctx = null;
      }
    });

    it("returns the caller's OWN dashboard data (student A → A)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const payload = await callDashboardRpc(client, c.studentId);
        // The seed enrolls the primary student in exactly one course, so their
        // own data must flow through the SECURITY INVOKER RPC.
        expect(payload.kpis.enrolledCourses).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("never returns another student's data (student A → B)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        // Called by student A with student B's id. RLS scopes every underlying
        // read to auth.uid() (= A), so B's rows are invisible: the payload must
        // be empty/zeroed, proving the RPC adds no new data visibility.
        const payload = await callDashboardRpc(client, c.otherStudentId);
        expect(payload.kpis.enrolledCourses).toBe(0);
        expect(payload.kpis.completedAssignments).toBe(0);
        expect(payload.deadlines).toEqual([]);
        expect(payload.announcements).toEqual([]);
        expect(payload.attendance).toEqual([]);
      } finally {
        await client.auth.signOut();
      }
    });

    it("is symmetric: student B cannot see student A's data (student B → A)", async () => {
      const c = getCtx();
      const client = await signInAs(c.otherStudentEmail, c.password);
      try {
        const payload = await callDashboardRpc(client, c.studentId);
        // A is enrolled in a course, but that is invisible to B.
        expect(payload.kpis.enrolledCourses).toBe(0);
        expect(payload.deadlines).toEqual([]);
        expect(payload.attendance).toEqual([]);
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
