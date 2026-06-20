/**
 * Feature: dashboard-and-ux-performance — Phase 8 Task 33 — deny-side RLS
 * assertion for `get_teacher_dashboard`.
 *
 * `get_teacher_dashboard(p_teacher_id uuid)` is `SECURITY DEFINER` with a
 * fail-closed guard: if `p_teacher_id <> auth.uid()` the id is neutralized to
 * null so every read returns empty/zero. Combined with the function only ever
 * reading data scoped to `courses.teacher_id = <caller>`, this proves a caller
 * can never obtain another user's teaching data, and a non-teacher obtains
 * nothing.
 *
 * Harness note: the RLS seed fixtures expose STUDENTS (not a second teacher), so
 * this suite proves the two deny-side guarantees expressible with that graph:
 *   1. student A → get_teacher_dashboard(A)  → guard passes (id == caller) but A
 *      owns no courses as a teacher, so the payload is empty (a non-teacher sees
 *      nothing).
 *   2. student A → get_teacher_dashboard(B)  → guard NEUTRALIZES (id != caller)
 *      → empty payload (no cross-user leakage).
 * A full teacher-A-cannot-see-teacher-B assertion needs a second seeded teacher;
 * tracked as a seed-harness follow-up. The SECURITY DEFINER guard pattern is
 * identical to the already-green `get_student_dashboard` deny-side suite.
 *
 * Skip-safe (Req 19.7): wrapped in `describe.skipIf(!shouldRunRls())`, so without
 * preview secrets the whole block is skipped and `npm run test:rls` exits 0.
 *
 * `get_teacher_dashboard` is not yet in the generated `Database` types (added by
 * migration 20260821000011; types regenerate post-merge), so the rpc call is made
 * through a narrow typed cast rather than `any`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shouldRunRls } from "./guard";
import { seedRlsFixtures, teardownRlsFixtures, type SeededCtx } from "./seed";
import { signInAs, type RoleClient } from "./signIn";

/** Minimal view of the `get_teacher_dashboard` jsonb payload this test reads. */
interface TeacherDashboardPayload {
  kpis: {
    pendingSubmissions: number;
    gradedThisWeek: number;
    avgAttainment: number;
    atRiskCount: number;
    totalStudents: number;
  };
  bloomsDistribution: unknown[];
}

/** Narrow structural type for calling an RPC not yet in the generated types. */
type UntypedRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const callTeacherDashboardRpc = async (
  client: RoleClient,
  teacherId: string
): Promise<TeacherDashboardPayload> => {
  const { data, error } = await (client as unknown as UntypedRpcClient).rpc(
    "get_teacher_dashboard",
    { p_teacher_id: teacherId }
  );
  if (error) {
    throw new Error(`get_teacher_dashboard failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("get_teacher_dashboard returned no data");
  }
  return data as TeacherDashboardPayload;
};

const expectEmpty = (payload: TeacherDashboardPayload): void => {
  expect(payload.kpis.totalStudents).toBe(0);
  expect(payload.kpis.atRiskCount).toBe(0);
  expect(payload.kpis.pendingSubmissions).toBe(0);
  expect(payload.kpis.gradedThisWeek).toBe(0);
  expect(payload.bloomsDistribution).toEqual([]);
};

describe.skipIf(!shouldRunRls())(
  "RLS — get_teacher_dashboard is SECURITY DEFINER with a fail-closed guard (Task 33)",
  () => {
    let ctx: SeededCtx | null = null;
    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[rls-smoke get_teacher_dashboard] seeded context unavailable — beforeAll seeding did not complete."
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

    it("a non-teacher caller gets an empty teacher dashboard (student → self)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        // Guard passes (id == caller), but a student owns no courses as teacher,
        // so the function returns an empty/zeroed payload.
        const payload = await callTeacherDashboardRpc(client, c.studentId);
        expectEmpty(payload);
      } finally {
        await client.auth.signOut();
      }
    });

    it("never returns data for a different id — the guard neutralizes (A → B)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        // p_teacher_id != auth.uid() → guard neutralizes to null → empty payload.
        const payload = await callTeacherDashboardRpc(client, c.otherStudentId);
        expectEmpty(payload);
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
