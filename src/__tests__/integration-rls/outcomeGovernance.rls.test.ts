/**
 * Feature: edeviser-agentic-intelligence, OBE-3/4/5 and QA-1.
 *
 * Executes only against an explicitly configured Supabase preview branch.
 * It proves role/type ownership, canonical mapping authorization, database
 * hierarchy validation, mapped-outcome deletion protection, and teacher-only
 * Sub-CLO ownership with real authenticated JWT clients.
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

interface OutcomeFixtures {
  iloId: string;
  ploId: string;
  cloId: string;
  foreignInstitutionId: string;
  foreignProgramId: string;
  foreignPloId: string;
}

type Clients = Record<
  "admin" | "coordinator" | "teacher" | "student" | "parent",
  RoleClient
>;

const run = describe.skipIf(!shouldRunRls());

run("outcome hierarchy governance RLS", () => {
  let ctx: SeededCtx;
  let fixtures: OutcomeFixtures;
  let clients: Clients;
  const subCloIds: string[] = [];

  beforeAll(async () => {
    ctx = await seedRlsFixtures();
    const admin = createAdminClient();

    const ilo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        title: `Governance ILO ${ctx.runId}`,
        type: "ILO",
      })
      .select("id")
      .single();
    if (ilo.error || !ilo.data) throw new Error(ilo.error?.message);

    const plo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        title: `Governance PLO ${ctx.runId}`,
        type: "PLO",
      })
      .select("id")
      .single();
    if (plo.error || !plo.data) throw new Error(plo.error?.message);

    const clo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        course_id: ctx.courseId,
        title: `Governance CLO ${ctx.runId}`,
        type: "CLO",
        blooms_level: "applying",
      })
      .select("id")
      .single();
    if (clo.error || !clo.data) throw new Error(clo.error?.message);

    const foreignInstitution = await admin
      .from("institutions")
      .insert({
        name: `Foreign Governance ${ctx.runId}`,
        slug: `foreign-governance-${ctx.runId}`,
        join_mode: "open",
      })
      .select("id")
      .single();
    if (foreignInstitution.error || !foreignInstitution.data) {
      throw new Error(foreignInstitution.error?.message);
    }
    const foreignProgram = await admin
      .from("programs")
      .insert({
        institution_id: foreignInstitution.data.id,
        name: `Foreign Program ${ctx.runId}`,
        code: `FG-${ctx.runId.slice(0, 8)}`,
      })
      .select("id")
      .single();
    if (foreignProgram.error || !foreignProgram.data) {
      throw new Error(foreignProgram.error?.message);
    }
    const foreignPlo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: foreignInstitution.data.id,
        program_id: foreignProgram.data.id,
        title: `Foreign PLO ${ctx.runId}`,
        type: "PLO",
      })
      .select("id")
      .single();
    if (foreignPlo.error || !foreignPlo.data) {
      throw new Error(foreignPlo.error?.message);
    }

    fixtures = {
      iloId: ilo.data.id,
      ploId: plo.data.id,
      cloId: clo.data.id,
      foreignInstitutionId: foreignInstitution.data.id,
      foreignProgramId: foreignProgram.data.id,
      foreignPloId: foreignPlo.data.id,
    };

    clients = Object.fromEntries(
      await Promise.all(
        (["admin", "coordinator", "teacher", "student", "parent"] as const).map(
          async (role) => [role, await signInAs(ctx.emails[role], ctx.password)]
        )
      )
    ) as Clients;
  });

  afterAll(async () => {
    if (!ctx || !fixtures) return;
    const admin = createAdminClient();
    if (subCloIds.length > 0) {
      await admin.from("sub_clos").delete().in("id", subCloIds);
    }
    await admin
      .from("outcome_mappings")
      .delete()
      .in("source_outcome_id", [fixtures.iloId, fixtures.ploId]);
    await admin
      .from("learning_outcomes")
      .delete()
      .in("id", [fixtures.cloId, fixtures.ploId, fixtures.iloId]);
    await admin
      .from("learning_outcomes")
      .delete()
      .eq("id", fixtures.foreignPloId);
    await admin.from("programs").delete().eq("id", fixtures.foreignProgramId);
    await admin
      .from("institutions")
      .delete()
      .eq("id", fixtures.foreignInstitutionId);
    await teardownRlsFixtures(ctx);
  });

  it("allows only the owning role to update each outcome type", async () => {
    const adminOwn = await clients.admin
      .from("learning_outcomes")
      .update({ description: "admin ILO update" })
      .eq("id", fixtures.iloId)
      .select("id");
    expect(adminOwn.error).toBeNull();
    expect(adminOwn.data).toHaveLength(1);

    const coordinatorOwn = await clients.coordinator
      .from("learning_outcomes")
      .update({ description: "coordinator PLO update" })
      .eq("id", fixtures.ploId)
      .select("id");
    expect(coordinatorOwn.error).toBeNull();
    expect(coordinatorOwn.data).toHaveLength(1);

    const teacherOwn = await clients.teacher
      .from("learning_outcomes")
      .update({ description: "teacher CLO update" })
      .eq("id", fixtures.cloId)
      .select("id");
    expect(teacherOwn.error).toBeNull();
    expect(teacherOwn.data).toHaveLength(1);

    const denied = await Promise.all([
      clients.admin
        .from("learning_outcomes")
        .update({ description: "wrong type" })
        .eq("id", fixtures.ploId)
        .select("id"),
      clients.coordinator
        .from("learning_outcomes")
        .update({ description: "wrong type" })
        .eq("id", fixtures.iloId)
        .select("id"),
      clients.teacher
        .from("learning_outcomes")
        .update({ description: "wrong type" })
        .eq("id", fixtures.ploId)
        .select("id"),
      clients.student
        .from("learning_outcomes")
        .update({ description: "forbidden" })
        .eq("id", fixtures.cloId)
        .select("id"),
      clients.parent
        .from("learning_outcomes")
        .update({ description: "forbidden" })
        .eq("id", fixtures.cloId)
        .select("id"),
    ]);
    for (const result of denied) {
      expect(result.error !== null || (result.data?.length ?? 0) === 0).toBe(
        true
      );
    }
  });

  it("allows canonical mappings and rejects invalid or cross-institution edges", async () => {
    const iloToPlo = await clients.coordinator
      .from("outcome_mappings")
      .insert({
        source_outcome_id: fixtures.iloId,
        target_outcome_id: fixtures.ploId,
        weight: 1,
      })
      .select("id");
    expect(iloToPlo.error).toBeNull();
    expect(iloToPlo.data).toHaveLength(1);

    const ploToClo = await clients.teacher
      .from("outcome_mappings")
      .insert({
        source_outcome_id: fixtures.ploId,
        target_outcome_id: fixtures.cloId,
        weight: 1,
      })
      .select("id");
    expect(ploToClo.error).toBeNull();
    expect(ploToClo.data).toHaveLength(1);

    const reversed = await clients.teacher.from("outcome_mappings").insert({
      source_outcome_id: fixtures.cloId,
      target_outcome_id: fixtures.ploId,
      weight: 1,
    });
    expect(reversed.error).not.toBeNull();

    const crossInstitution = await clients.coordinator
      .from("outcome_mappings")
      .insert({
        source_outcome_id: fixtures.iloId,
        target_outcome_id: fixtures.foreignPloId,
        weight: 1,
      });
    expect(crossInstitution.error).not.toBeNull();
  });

  it("blocks deletion of a mapped ILO", async () => {
    const result = await clients.admin
      .from("learning_outcomes")
      .delete()
      .eq("id", fixtures.iloId)
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("allows assigned teachers, but not coordinators, to manage Sub-CLOs", async () => {
    const teacherInsert = await clients.teacher
      .from("sub_clos")
      .insert({ clo_id: fixtures.cloId, title: `Sub-CLO ${ctx.runId}` })
      .select("id")
      .single();
    expect(teacherInsert.error).toBeNull();
    if (teacherInsert.data) subCloIds.push(teacherInsert.data.id);

    const coordinatorInsert = await clients.coordinator
      .from("sub_clos")
      .insert({ clo_id: fixtures.cloId, title: `Forbidden ${ctx.runId}` });
    expect(coordinatorInsert.error).not.toBeNull();
  });
});
