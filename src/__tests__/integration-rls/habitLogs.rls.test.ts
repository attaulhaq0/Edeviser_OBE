/**
 * Deny-side parity for the habit_logs RLS optimizations.
 *
 * Migration 20260821000030 wrapped the bare `auth_user_role()` /
 * `auth_institution_id()` calls in `(select ...)` (InitPlan caching) and dropped
 * a redundant student-own SELECT policy.
 *
 * Migration 20260822000003 then CONSOLIDATED the remaining policies to exactly
 * one permissive policy per command (SELECT/INSERT/UPDATE/DELETE) and replaced
 * the inline `student_id IN (SELECT ... FROM profiles ...)` institution filter
 * with the SECURITY DEFINER helper `is_student_in_my_institution()` (planner-cost
 * flattening). Both migrations are behavior-preserving by construction, but a
 * consolidation could regress into a cross-student or cross-institution leak —
 * this suite proves it does not, asserting the ALLOWED and DENIED rows for the
 * student (own), parent (verified link), and staff/admin (institution) branches.
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

/**
 * A student seeded in a DIFFERENT institution, used to prove the consolidated
 * staff/admin SELECT branch (institution-scoped via the new
 * `is_student_in_my_institution()` helper) does NOT leak across institutions.
 */
interface ForeignStudent {
  readonly institutionId: string;
  readonly studentId: string;
}

/**
 * Seeds a second institution with one student + one habit_log (service-role,
 * bypassing RLS). Kept LOCAL to this suite rather than in the shared seed so no
 * other RLS suite's row counts are affected.
 */
const seedForeignInstitutionStudent = async (): Promise<ForeignStudent> => {
  const admin = createAdminClient();
  const runId = randomUUID();
  const email = `rls-smoke+foreign-student+${runId}@example.test`;
  const password = `Rls!${runId}-aA9`;

  const inst = await admin
    .from("institutions")
    .insert({
      name: `RLS Smoke Foreign Institution ${runId}`,
      slug: `rls-smoke-foreign-${runId}`,
      join_mode: "open",
    })
    .select("id")
    .single();
  if (inst.error || !inst.data) {
    throw new Error(
      `seed foreign institution failed: ${inst.error?.message ?? "no data"}`
    );
  }
  const institutionId = inst.data.id;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "RLS Smoke foreign student",
      institution_id: institutionId,
    },
  });
  if (created.error || !created.data.user) {
    throw new Error(
      `seed foreign student user failed: ${created.error?.message ?? "no user"}`
    );
  }
  const studentId = created.data.user.id;

  // Pin the profile to the foreign institution (the new-user trigger forces
  // role=student, which is what we want here anyway).
  const upserted = await admin.from("profiles").upsert(
    {
      id: studentId,
      email,
      full_name: "RLS Smoke foreign student",
      role: "student",
      institution_id: institutionId,
      status: "active",
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (upserted.error) {
    throw new Error(
      `seed foreign student profile failed: ${upserted.error.message}`
    );
  }

  const hl = await admin.from("habit_logs").upsert(
    [
      {
        student_id: studentId,
        habit_type: "login",
        date: HABIT_DATE,
        completed_at: `${HABIT_DATE}T08:00:00.000Z`,
      },
    ],
    { onConflict: "student_id,habit_type,date" }
  );
  if (hl.error) {
    throw new Error(`seed foreign habit_logs failed: ${hl.error.message}`);
  }

  return { institutionId, studentId };
};

const teardownForeignInstitutionStudent = async (
  foreign: ForeignStudent
): Promise<void> => {
  const admin = createAdminClient();
  try {
    await admin.from("habit_logs").delete().eq("student_id", foreign.studentId);
    await admin.auth.admin.deleteUser(foreign.studentId);
    // Residual profile (in case the cascade did not fire), then the institution.
    await admin.from("profiles").delete().eq("id", foreign.studentId);
    await admin.from("institutions").delete().eq("id", foreign.institutionId);
  } catch (error) {
    console.warn(`[foreign institution teardown] skipped: ${String(error)}`);
  }
};

describe.skipIf(!shouldRunRls())(
  "RLS — habit_logs optimization preserves per-student isolation (Option J Phase 1b)",
  () => {
    let ctx: SeededCtx | null = null;
    let foreign: ForeignStudent | null = null;

    const getCtx = (): SeededCtx => {
      if (ctx === null) {
        throw new Error(
          "[habit_logs] seeded context unavailable — beforeAll did not complete."
        );
      }
      return ctx;
    };

    const getForeign = (): ForeignStudent => {
      if (foreign === null) {
        throw new Error(
          "[habit_logs] foreign-institution fixture unavailable — beforeAll did not complete."
        );
      }
      return foreign;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
      await seedHabitLogs(ctx);
      foreign = await seedForeignInstitutionStudent();
    });

    afterAll(async () => {
      if (foreign !== null) {
        await teardownForeignInstitutionStudent(foreign);
        foreign = null;
      }
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

    it("teacher reads habit_logs of students in their institution, not another", async () => {
      const c = getCtx();
      const f = getForeign();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        // Allowed: a student in the teacher's own institution.
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        // Denied: a student in a DIFFERENT institution.
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", f.studentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("coordinator reads habit_logs within their institution, not another", async () => {
      const c = getCtx();
      const f = getForeign();
      const client = await signInAs(c.emails.coordinator, c.password);
      try {
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", f.studentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("admin reads habit_logs within their institution, not another", async () => {
      const c = getCtx();
      const f = getForeign();
      const client = await signInAs(c.emails.admin, c.password);
      try {
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        expect(
          await countRows(
            client.from("habit_logs").select("id").eq("student_id", f.studentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("student cannot insert a habit_log for another student", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const { error } = await client.from("habit_logs").insert({
          student_id: c.otherStudentId,
          habit_type: "login",
          date: "2025-03-05",
          completed_at: "2025-03-05T08:00:00.000Z",
        });
        // WITH CHECK denies: a student may write only their own habit_logs.
        expect(error).toBeTruthy();
      } finally {
        await client.auth.signOut();
      }
    });

    it("teacher cannot insert a habit_log (staff have no write access)", async () => {
      const c = getCtx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        const { error } = await client.from("habit_logs").insert({
          student_id: c.studentId,
          habit_type: "login",
          date: "2025-03-06",
          completed_at: "2025-03-06T08:00:00.000Z",
        });
        expect(error).toBeTruthy();
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
