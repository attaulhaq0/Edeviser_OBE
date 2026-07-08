/**
 * Deny-side parity for the team_members RLS consolidation (migration
 * 20260822000004).
 *
 * That migration merges 7 permissive policies into one per command
 * (SELECT/INSERT/UPDATE/DELETE) and replaces every inline
 * `team_id IN (SELECT ... FROM teams ...)` subquery with SECURITY DEFINER
 * helpers (planner-cost flattening). It is behavior-preserving by construction,
 * but a consolidation could regress into a leak or a broken write path — this
 * suite proves it does not, asserting the ALLOWED and DENIED cases for each
 * branch:
 *   SELECT  — student(enrolled) / teacher(course) / admin(institution) /
 *             parent(verified link); coordinator + non-enrolled student denied.
 *   INSERT  — student self-add allowed; a non-captain/non-teacher inserting
 *             someone else denied.
 *   UPDATE  — captain of a STUDENT_FORMED team allowed; the SAME captain on a
 *             TEACHER_ASSIGNED team denied (the student_formed gate); teacher of
 *             the course allowed.
 *
 * A SELECT/UPDATE RLS policy does not raise on denial — it filters rows — so
 * those cases assert on the row count returned (0 = filtered). INSERT denial
 * raises (WITH CHECK → 42501), so those assert on a truthy error.
 *
 * Skip-safety (Req 19.7): `describe.skipIf(!shouldRunRls())`, so with no preview
 * secrets nothing connects and `npm run test:rls` exits 0. It runs for real only
 * on the dedicated `rls-smoke` preview CI job (migration applied on the branch).
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

/**
 * Team fixtures seeded on top of the base RLS graph, all via the service-role
 * admin client (bypassing RLS). Kept LOCAL to this suite so the shared seed
 * (used by other RLS suites) is untouched.
 *
 * - teamAssigned: a team in the base teacher_assigned course (ctx.courseId),
 *   captained by ctx.studentId, with BOTH the seeded student and otherStudent
 *   as members.
 * - teamFormed: a team in a NEW student_formed course (ctx.teacher teaches it,
 *   ctx.student enrolled), captained by ctx.studentId, with otherStudent as its
 *   single member (so the seeded student is free to self-insert there).
 */
interface TeamFixtures {
  readonly teamAssignedId: string;
  readonly teamFormedId: string;
  readonly courseFormedId: string;
  readonly sectionFormedId: string;
}

const must = <T>(
  result: { data: T | null; error: { message: string } | null },
  step: string
): T => {
  if (result.error || result.data === null) {
    throw new Error(
      `[team_members seed] ${step}: ${result.error?.message ?? "no data"}`
    );
  }
  return result.data;
};

const seedTeamFixtures = async (ctx: SeededCtx): Promise<TeamFixtures> => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  // teacher_assigned team in the base course, captained by the seeded student.
  const teamAssigned = must<{ id: string }>(
    await admin
      .from("teams")
      .insert({
        course_id: ctx.courseId,
        name: `RLS Team Assigned ${runId}`,
        created_by: ctx.teacherId,
        institution_id: ctx.institutionId,
        captain_id: ctx.studentId,
      })
      .select("id")
      .single(),
    "teams insert (assigned)"
  );

  // A student_formed course taught by the same teacher, with the seeded student
  // enrolled — needed to exercise the captain student_formed write branch.
  const courseFormed = must<{ id: string }>(
    await admin
      .from("courses")
      .insert({
        name: `RLS Course Formed ${runId}`,
        code: `RLS-CF-${runId}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: ctx.semesterId,
        program_id: ctx.programId,
        teacher_id: ctx.teacherId,
        team_formation_mode: "student_formed",
      })
      .select("id")
      .single(),
    "courses insert (formed)"
  );

  const sectionFormed = must<{ id: string }>(
    await admin
      .from("course_sections")
      .insert({
        course_id: courseFormed.id,
        section_code: `SEC-CF-${runId}`,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single(),
    "course_sections insert (formed)"
  );

  must(
    await admin
      .from("student_courses")
      .insert({
        course_id: courseFormed.id,
        student_id: ctx.studentId,
        section_id: sectionFormed.id,
        status: "active",
      })
      .select("id")
      .single(),
    "student_courses insert (formed)"
  );

  const teamFormed = must<{ id: string }>(
    await admin
      .from("teams")
      .insert({
        course_id: courseFormed.id,
        name: `RLS Team Formed ${runId}`,
        created_by: ctx.teacherId,
        institution_id: ctx.institutionId,
        captain_id: ctx.studentId,
      })
      .select("id")
      .single(),
    "teams insert (formed)"
  );

  // Members: teamAssigned has both students; teamFormed has otherStudent only.
  const { error: memErr } = await admin.from("team_members").insert([
    { team_id: teamAssigned.id, student_id: ctx.studentId },
    { team_id: teamAssigned.id, student_id: ctx.otherStudentId },
    { team_id: teamFormed.id, student_id: ctx.otherStudentId },
  ]);
  if (memErr)
    throw new Error(`[team_members seed] members insert: ${memErr.message}`);

  return {
    teamAssignedId: teamAssigned.id,
    teamFormedId: teamFormed.id,
    courseFormedId: courseFormed.id,
    sectionFormedId: sectionFormed.id,
  };
};

const teardownTeamFixtures = async (fx: TeamFixtures): Promise<void> => {
  const admin = createAdminClient();
  try {
    await admin
      .from("team_members")
      .delete()
      .in("team_id", [fx.teamAssignedId, fx.teamFormedId]);
    await admin
      .from("teams")
      .delete()
      .in("id", [fx.teamAssignedId, fx.teamFormedId]);
    await admin
      .from("student_courses")
      .delete()
      .eq("course_id", fx.courseFormedId);
    await admin.from("course_sections").delete().eq("id", fx.sectionFormedId);
    await admin.from("courses").delete().eq("id", fx.courseFormedId);
  } catch (error) {
    console.warn(`[team_members teardown] skipped: ${String(error)}`);
  }
};

type IdRowsResult = PromiseLike<{
  data: { id: string }[] | null;
  error: { message: string } | null;
}>;

const countRows = async (query: IdRowsResult): Promise<number> => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
};

describe.skipIf(!shouldRunRls())(
  "RLS — team_members consolidation preserves access + isolation (migration 20260822000004)",
  () => {
    let ctx: SeededCtx | null = null;
    let fx: TeamFixtures | null = null;

    const getCtx = (): SeededCtx => {
      if (ctx === null)
        throw new Error("[team_members] ctx unavailable — beforeAll failed.");
      return ctx;
    };
    const getFx = (): TeamFixtures => {
      if (fx === null)
        throw new Error(
          "[team_members] fixtures unavailable — beforeAll failed."
        );
      return fx;
    };

    beforeAll(async () => {
      ctx = await seedRlsFixtures();
      fx = await seedTeamFixtures(ctx);
    });

    afterAll(async () => {
      if (fx !== null) await teardownTeamFixtures(fx);
      if (ctx !== null) await teardownRlsFixtures(ctx);
      ctx = null;
      fx = null;
    });

    // ---- SELECT ------------------------------------------------------------
    it("enrolled student sees members of a team in their course", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
          )
        ).toBeGreaterThanOrEqual(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("a member who is NOT enrolled in the course cannot see the team's members", async () => {
      const c = getCtx();
      const f = getFx();
      // otherStudent is a MEMBER of teamAssigned but is NOT enrolled in the
      // course — the policy is enrollment-scoped, so they must see nothing.
      const client = await signInAs(c.otherStudentEmail, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("coordinator has no team_members read branch (sees none)", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.coordinator, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("teacher of the course sees the team's members", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
          )
        ).toBeGreaterThanOrEqual(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("admin sees members of a team in their institution", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.admin, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
          )
        ).toBeGreaterThanOrEqual(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("parent sees their linked child's membership row but not another student's", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.parent, c.password);
      try {
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
              .eq("student_id", c.studentId)
          )
        ).toBeGreaterThanOrEqual(1);
        expect(
          await countRows(
            client
              .from("team_members")
              .select("id")
              .eq("team_id", f.teamAssignedId)
              .eq("student_id", c.otherStudentId)
          )
        ).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- UPDATE (the student_formed captain gate) --------------------------
    it("captain of a student_formed team can update a member", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const { data, error } = await client
          .from("team_members")
          .update({ role: "member" })
          .eq("team_id", f.teamFormedId)
          .eq("student_id", c.otherStudentId)
          .select("id");
        if (error) throw new Error(error.message);
        expect(data?.length ?? 0).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    it("the SAME student captain CANNOT update a member of a teacher_assigned team", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        const { data, error } = await client
          .from("team_members")
          .update({ role: "member" })
          .eq("team_id", f.teamAssignedId)
          .eq("student_id", c.otherStudentId)
          .select("id");
        if (error) throw new Error(error.message);
        // RLS filters the row out of the UPDATE — zero rows affected.
        expect(data?.length ?? 0).toBe(0);
      } finally {
        await client.auth.signOut();
      }
    });

    it("teacher of the course can update a member of a team in that course", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.teacher, c.password);
      try {
        const { data, error } = await client
          .from("team_members")
          .update({ role: "member" })
          .eq("team_id", f.teamAssignedId)
          .eq("student_id", c.otherStudentId)
          .select("id");
        if (error) throw new Error(error.message);
        expect(data?.length ?? 0).toBe(1);
      } finally {
        await client.auth.signOut();
      }
    });

    // ---- INSERT ------------------------------------------------------------
    it("a student can add themselves to a team", async () => {
      const c = getCtx();
      const f = getFx();
      const client = await signInAs(c.emails.student, c.password);
      try {
        // studentId is not yet a member of teamFormed (otherStudent is) — self-add.
        const { error } = await client
          .from("team_members")
          .insert({ team_id: f.teamFormedId, student_id: c.studentId });
        expect(error).toBeFalsy();
      } finally {
        await client.auth.signOut();
      }
    });

    it("a non-captain, non-teacher cannot add another student", async () => {
      const c = getCtx();
      const f = getFx();
      // Coordinator: no INSERT branch, and the target is not themselves.
      const client = await signInAs(c.emails.coordinator, c.password);
      try {
        const { error } = await client
          .from("team_members")
          .insert({ team_id: f.teamFormedId, student_id: c.otherStudentId });
        expect(error).toBeTruthy();
      } finally {
        await client.auth.signOut();
      }
    });
  }
);
