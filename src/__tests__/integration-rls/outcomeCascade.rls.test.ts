/**
 * Feature: edeviser-agentic-intelligence — task 1.6 (Phase 1 regression tests).
 *
 * Data-level CLO→PLO→ILO attainment-cascade regression suite. Executes only
 * against an explicitly configured Supabase PREVIEW branch (never production —
 * see guard.ts). All fixture writes use the service-role admin client; the
 * `trigger_attainment_rollup` trigger on `grades` is SECURITY DEFINER and fires
 * regardless of the writing client, so these tests exercise the REAL rollup
 * path end-to-end:
 *
 *   grade insert → evidence rows (canonical PLO/ILO resolution)
 *     → outcome_attainment @ student_course (CLO)
 *     → outcome_attainment @ course (PLO, mapping-weighted)
 *     → outcome_attainment @ program (ILO, mapping-weighted)
 *
 * Covered cases (PDF §17, §38):
 *   1.  One-to-one chain (single ILO→PLO→CLO edge set, weight 1).
 *   2.  One-to-many (one ILO → many PLOs, weighted contribution).
 *   3.  Many-to-one (many CLOs → one PLO, weighted average).
 *   4.  Weight validation: any write leaving a child's incoming weights ≠ 1.0
 *       is rejected (deferred trg_outcome_mapping_weight_sum).
 *   5.  Grade update / reversal: evidence is idempotent per
 *       (student, submission, CLO); attainment recomputes from evidence.
 *   6.  Empty evidence: no grades ⇒ no attainment; unmapped CLOs are skipped
 *       without blocking sibling CLOs in the same assignment.
 *   7.  Duplicate mappings rejected (unique source/target pair).
 *   8.  Institution isolation: cross-institution mapping endpoints rejected.
 *
 * Live-verified basis (2026-08-22, project cdlgtbvxlxjpcddjazzx):
 *   - outcome_mappings UNIQUE (source_outcome_id, target_outcome_id),
 *     CHECK weight ∈ [0,1], DEFERRABLE weight-sum trigger (= 1.0 ± 0.0001).
 *   - validate_outcome_mapping_hierarchy: only ILO→PLO / PLO→CLO, same
 *     institution, same program for PLO→CLO, cycle-free.
 *   - trigger_attainment_rollup: resolves canonical parent chain
 *     (source=parent WHERE target=child), evidence ON CONFLICT DO NOTHING,
 *     attainment upsert keyed by (outcome, student, course, scope).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { shouldRunRls } from "./guard";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type AdminClient,
  type SeededCtx,
} from "./seed";

/** A fully wired ILO→PLO(s)→CLO(s) fixture graph for one scenario. */
interface ChainFixture {
  iloId: string;
  ploIds: string[];
  cloIds: string[];
  assignmentIds: string[];
}

const run = describe.skipIf(!shouldRunRls());

/** Inserts one learning_outcomes row and returns its id. */
async function insertOutcome(
  admin: AdminClient,
  params: {
    institutionId: string;
    programId?: string | null;
    courseId?: string | null;
    type: "ILO" | "PLO" | "CLO";
    title: string;
  }
): Promise<string> {
  const { data, error } = await admin
    .from("learning_outcomes")
    .insert({
      institution_id: params.institutionId,
      program_id: params.programId ?? null,
      course_id: params.courseId ?? null,
      type: params.type,
      title: params.title,
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(`insertOutcome failed: ${error?.message}`);
  return data.id;
}

/** Inserts one canonical mapping edge (source=parent → target=child). */
async function insertMapping(
  admin: AdminClient,
  sourceOutcomeId: string,
  targetOutcomeId: string,
  weight: number
): Promise<string> {
  const { data, error } = await admin
    .from("outcome_mappings")
    .insert({
      source_outcome_id: sourceOutcomeId,
      target_outcome_id: targetOutcomeId,
      weight,
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(`insertMapping failed: ${error?.message}`);
  return data.id;
}

/**
 * Creates an assignment (with the given CLO weights), a submission for the
 * enrolled student, and a released grade — firing the real attainment-rollup
 * trigger. Returns the grade id.
 */
async function gradeSubmission(
  admin: AdminClient,
  params: {
    ctx: SeededCtx;
    title: string;
    cloWeights: Array<{ clo_id: string; weight: number }>;
    scorePercent: number;
  }
): Promise<{ assignmentId: string; submissionId: string; gradeId: string }> {
  const { ctx } = params;
  const assignment = await admin
    .from("assignments")
    .insert({
      course_id: ctx.courseId,
      created_by: ctx.teacherId,
      title: params.title,
      type: "assignment",
      total_marks: 100,
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      is_late_allowed: true,
      late_window_hours: 24,
      clo_weights: params.cloWeights,
    })
    .select("id")
    .single();
  if (assignment.error || !assignment.data) {
    throw new Error(`assignment insert failed: ${assignment.error?.message}`);
  }

  const submission = await admin
    .from("submissions")
    .insert({
      assignment_id: assignment.data.id,
      student_id: ctx.studentId,
      text_content: `cascade-test submission ${params.title}`,
      is_late: false,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    })
    .select("id")
    .single();
  if (submission.error || !submission.data) {
    throw new Error(`submission insert failed: ${submission.error?.message}`);
  }

  const grade = await admin
    .from("grades")
    .insert({
      submission_id: submission.data.id,
      graded_by: ctx.teacherId,
      rubric_selections: [],
      total_score: params.scorePercent,
      score_percent: params.scorePercent,
      overall_feedback: "cascade regression",
      is_released: true,
    })
    .select("id")
    .single();
  if (grade.error || !grade.data) {
    throw new Error(`grade insert failed: ${grade.error?.message}`);
  }

  return {
    assignmentId: assignment.data.id,
    submissionId: submission.data.id,
    gradeId: grade.data.id,
  };
}

run("OBE attainment cascade (task 1.6)", () => {
  let ctx: SeededCtx;
  let admin: AdminClient;
  /** Every grade/submission/assignment created during the run (teardown). */
  const gradeIds: string[] = [];
  const submissionIds: string[] = [];
  const assignmentIds: string[] = [];
  /** Outcome/mapping ids created during the run (teardown). */
  const outcomeIds: string[] = [];
  const mappingIds: string[] = [];
  /** Foreign-institution fixtures (institution isolation case). */
  let foreignInstitutionId: string | null = null;
  let foreignProgramId: string | null = null;
  let foreignPloId: string | null = null;

  beforeAll(async () => {
    ctx = await seedRlsFixtures();
    admin = createAdminClient();
  });

  afterAll(async () => {
    if (!ctx) return;
    const a = createAdminClient();

    // Dependency order: attainment/evidence/xp → grades → submissions →
    // assignments → mappings → outcomes → foreign fixtures → base fixtures.
    if (outcomeIds.length > 0) {
      await a.from("outcome_attainment").delete().in("outcome_id", outcomeIds);
    }
    if (gradeIds.length > 0) {
      await a.from("evidence").delete().in("grade_id", gradeIds);
      await a.from("xp_transactions").delete().in("reference_id", gradeIds);
      await a.from("grades").delete().in("id", gradeIds);
    }
    if (submissionIds.length > 0) {
      await a.from("submissions").delete().in("id", submissionIds);
    }
    if (assignmentIds.length > 0) {
      await a.from("assignments").delete().in("id", assignmentIds);
    }
    if (mappingIds.length > 0) {
      await a.from("outcome_mappings").delete().in("id", mappingIds);
    }
    if (outcomeIds.length > 0) {
      await a.from("learning_outcomes").delete().in("id", outcomeIds);
    }
    if (foreignPloId) {
      await a.from("learning_outcomes").delete().eq("id", foreignPloId);
    }
    if (foreignProgramId) {
      await a.from("programs").delete().eq("id", foreignProgramId);
    }
    if (foreignInstitutionId) {
      await a.from("institutions").delete().eq("id", foreignInstitutionId);
    }
    await teardownRlsFixtures(ctx);
  });

  /** Registers ids for teardown and returns them unchanged. */
  function track(chain: ChainFixture): ChainFixture {
    outcomeIds.push(chain.iloId, ...chain.ploIds, ...chain.cloIds);
    assignmentIds.push(...chain.assignmentIds);
    return chain;
  }

  it("case 1 — one-to-one chain rolls CLO→PLO→ILO at weight 1", async () => {
    const ilo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      type: "ILO",
      title: `Cascade ILO 1:1 ${ctx.runId}`,
    });
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO 1:1 ${ctx.runId}`,
    });
    const clo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO 1:1 ${ctx.runId}`,
    });
    mappingIds.push(
      await insertMapping(admin, ilo, plo, 1),
      await insertMapping(admin, plo, clo, 1)
    );
    const chain = track({
      iloId: ilo,
      ploIds: [plo],
      cloIds: [clo],
      assignmentIds: [],
    });

    const g = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A 1:1 ${ctx.runId}`,
      cloWeights: [{ clo_id: clo, weight: 1 }],
      scorePercent: 90,
    });
    gradeIds.push(g.gradeId);
    submissionIds.push(g.submissionId);
    chain.assignmentIds.push(g.assignmentId);

    // Evidence carries the CANONICAL denormalized path (source=parent reads).
    const evidence = await admin
      .from("evidence")
      .select("clo_id, plo_id, ilo_id, score_percent, attainment_level")
      .eq("grade_id", g.gradeId);
    expect(evidence.error).toBeNull();
    expect(evidence.data).toHaveLength(1);
    expect(evidence.data?.[0]).toMatchObject({
      clo_id: clo,
      plo_id: plo,
      ilo_id: ilo,
      score_percent: 90,
      attainment_level: "excellent",
    });

    // Attainment cascades through all three scopes.
    const cloAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent, sample_count")
      .eq("outcome_id", clo)
      .eq("scope", "student_course")
      .maybeSingle();
    expect(cloAtt.data).toMatchObject({
      attainment_percent: 90,
      sample_count: 1,
    });

    const ploAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent, sample_count")
      .eq("outcome_id", plo)
      .eq("scope", "course")
      .maybeSingle();
    expect(ploAtt.data).toMatchObject({
      attainment_percent: 90,
      sample_count: 1,
    });

    const iloAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent, sample_count")
      .eq("outcome_id", ilo)
      .eq("scope", "program")
      .maybeSingle();
    expect(iloAtt.data).toMatchObject({
      attainment_percent: 90,
      sample_count: 1,
    });
  });

  it("case 2 — one-to-many: ILO combines many PLOs by mapping weight", async () => {
    // ILO → PLOa (0.6), ILO → PLOb (0.4); PLOa → CLOa (1); PLOb → CLOb (1).
    const ilo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      type: "ILO",
      title: `Cascade ILO 1:N ${ctx.runId}`,
    });
    const ploA = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO 1:N-a ${ctx.runId}`,
    });
    const ploB = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO 1:N-b ${ctx.runId}`,
    });
    const cloA = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO 1:N-a ${ctx.runId}`,
    });
    const cloB = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO 1:N-b ${ctx.runId}`,
    });
    // Per-child normalization invariant (migration 20260823000008): EVERY child
    // receives total parent weight exactly 1.0 — so a one-to-many fan-out uses
    // full weight per edge, not fractional splits.
    mappingIds.push(
      await insertMapping(admin, ilo, ploA, 1),
      await insertMapping(admin, ilo, ploB, 1),
      await insertMapping(admin, ploA, cloA, 1),
      await insertMapping(admin, ploB, cloB, 1)
    );
    const chain = track({
      iloId: ilo,
      ploIds: [ploA, ploB],
      cloIds: [cloA, cloB],
      assignmentIds: [],
    });

    // Two separate assignments with different scores: CLOa=60, CLOb=100.
    const gA = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A 1:N-a ${ctx.runId}`,
      cloWeights: [{ clo_id: cloA, weight: 1 }],
      scorePercent: 60,
    });
    const gB = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A 1:N-b ${ctx.runId}`,
      cloWeights: [{ clo_id: cloB, weight: 1 }],
      scorePercent: 100,
    });
    gradeIds.push(gA.gradeId, gB.gradeId);
    submissionIds.push(gA.submissionId, gB.submissionId);
    chain.assignmentIds.push(gA.assignmentId, gB.assignmentId);

    const ploAAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent")
      .eq("outcome_id", ploA)
      .eq("scope", "course")
      .maybeSingle();
    expect(ploAAtt.data?.attainment_percent).toBe(60);

    const ploBAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent")
      .eq("outcome_id", ploB)
      .eq("scope", "course")
      .maybeSingle();
    expect(ploBAtt.data?.attainment_percent).toBe(100);

    // ILO = normalized weighted mean of children: (60*1 + 100*1)/(1+1) = 80.
    const iloAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent")
      .eq("outcome_id", ilo)
      .eq("scope", "program")
      .maybeSingle();
    expect(iloAtt.data?.attainment_percent).toBe(80);
  });

  it("case 3 — many-to-one: PLO averages many mapped CLOs", async () => {
    // Two CLOs mapped into ONE PLO — each child edge carries full weight 1.0
    // (the per-child sum invariant); PLO ← ILO (1).
    const ilo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      type: "ILO",
      title: `Cascade ILO N:1 ${ctx.runId}`,
    });
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO N:1 ${ctx.runId}`,
    });
    const cloA = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO N:1-a ${ctx.runId}`,
    });
    const cloB = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO N:1-b ${ctx.runId}`,
    });
    mappingIds.push(
      await insertMapping(admin, ilo, plo, 1),
      await insertMapping(admin, plo, cloA, 1),
      await insertMapping(admin, plo, cloB, 1)
    );
    const chain = track({
      iloId: ilo,
      ploIds: [plo],
      cloIds: [cloA, cloB],
      assignmentIds: [],
    });

    const gA = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A N:1-a ${ctx.runId}`,
      cloWeights: [{ clo_id: cloA, weight: 1 }],
      scorePercent: 50,
    });
    const gB = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A N:1-b ${ctx.runId}`,
      cloWeights: [{ clo_id: cloB, weight: 1 }],
      scorePercent: 90,
    });
    gradeIds.push(gA.gradeId, gB.gradeId);
    submissionIds.push(gA.submissionId, gB.submissionId);
    chain.assignmentIds.push(gA.assignmentId, gB.assignmentId);

    // PLO = normalized weighted mean: (50*1 + 90*1)/(1+1) = 70.
    const ploAtt = await admin
      .from("outcome_attainment")
      .select("attainment_percent, sample_count")
      .eq("outcome_id", plo)
      .eq("scope", "course")
      .maybeSingle();
    expect(ploAtt.data?.attainment_percent).toBe(70);
    expect(ploAtt.data?.sample_count).toBe(2);
  });

  it("case 4 — weight changes that break the 1.0 sum are rejected", async () => {
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO W ${ctx.runId}`,
    });
    const cloA = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO W-a ${ctx.runId}`,
    });
    const cloB = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO W-b ${ctx.runId}`,
    });
    // Baseline: each child edge carries full weight 1.0 (per-child invariant).
    const edgeA = await insertMapping(admin, plo, cloA, 1);
    mappingIds.push(edgeA, await insertMapping(admin, plo, cloB, 1));
    outcomeIds.push(plo, cloA, cloB);

    // UPDATE breaking the child sum (1 → 0.7 leaves 0.7) must be rejected.
    const badUpdate = await admin
      .from("outcome_mappings")
      .update({ weight: 0.7 })
      .eq("id", edgeA);
    expect(badUpdate.error).not.toBeNull();

    // INSERT adding a third edge (sum would exceed 1.0) must be rejected.
    const cloC = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO W-c ${ctx.runId}`,
    });
    outcomeIds.push(cloC);
    const badInsert = await admin.from("outcome_mappings").insert({
      source_outcome_id: plo,
      target_outcome_id: cloC,
      weight: 0.5,
    });
    expect(badInsert.error).not.toBeNull();

    // Positive control: completing the NEW child to exactly 1.0 is accepted —
    // proving the trigger enforces normalization, not a blanket write ban.
    mappingIds.push(await insertMapping(admin, plo, cloC, 1));

    // KNOWN ENFORCEMENT GAP (deferral ledger issue #278): deleting a child's
    // ONLY edge escapes the deferred sum-check because SUM(weight) over zero
    // remaining rows is NULL — the child silently becomes unmapped. This test
    // pins CURRENT behavior until the DB trigger is hardened.
    const deleteOnlyEdge = await admin
      .from("outcome_mappings")
      .delete()
      .eq("id", edgeA);
    expect(deleteOnlyEdge.error).toBeNull();
  });

  it("case 5 — grade update/reversal keeps evidence idempotent", async () => {
    const ilo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      type: "ILO",
      title: `Cascade ILO rev ${ctx.runId}`,
    });
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO rev ${ctx.runId}`,
    });
    const clo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO rev ${ctx.runId}`,
    });
    mappingIds.push(
      await insertMapping(admin, ilo, plo, 1),
      await insertMapping(admin, plo, clo, 1)
    );
    const chain = track({
      iloId: ilo,
      ploIds: [plo],
      cloIds: [clo],
      assignmentIds: [],
    });

    const g = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A rev ${ctx.runId}`,
      cloWeights: [{ clo_id: clo, weight: 1 }],
      scorePercent: 90,
    });
    gradeIds.push(g.gradeId);
    submissionIds.push(g.submissionId);
    chain.assignmentIds.push(g.assignmentId);

    // UPDATE the grade (re-grade lower): evidence must NOT duplicate
    // (unique student+submission+CLO, ON CONFLICT DO NOTHING).
    const regrade = await admin
      .from("grades")
      .update({ score_percent: 60, total_score: 60 })
      .eq("id", g.gradeId);
    expect(regrade.error).toBeNull();

    const evidenceAfter = await admin
      .from("evidence")
      .select("id, score_percent")
      .eq("grade_id", g.gradeId);
    expect(evidenceAfter.data).toHaveLength(1);

    // Attainment recomputes from the (unchanged) evidence sample set.
    const att = await admin
      .from("outcome_attainment")
      .select("attainment_percent, sample_count")
      .eq("outcome_id", clo)
      .eq("scope", "student_course")
      .maybeSingle();
    expect(att.data?.sample_count).toBe(1);
    expect(att.data?.attainment_percent).toBe(90);

    // REVERSAL: restore the original score — still exactly one evidence row.
    const revert = await admin
      .from("grades")
      .update({ score_percent: 90, total_score: 90 })
      .eq("id", g.gradeId);
    expect(revert.error).toBeNull();
    const evidenceFinal = await admin
      .from("evidence")
      .select("id")
      .eq("grade_id", g.gradeId);
    expect(evidenceFinal.data).toHaveLength(1);
  });

  it("case 6 — empty/unmapped evidence is skipped without blocking siblings", async () => {
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO empty ${ctx.runId}`,
    });
    const cloMapped = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO empty-mapped ${ctx.runId}`,
    });
    // An UNMAPPED CLO: no PLO parent — the rollup skips it with a warning and
    // still grades the mapped siblings (verified against live Preview).
    const cloOrphan = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO empty-orphan ${ctx.runId}`,
    });
    mappingIds.push(await insertMapping(admin, plo, cloMapped, 1));
    outcomeIds.push(plo, cloMapped, cloOrphan);

    const g = await gradeSubmission(admin, {
      ctx,
      title: `Cascade A empty ${ctx.runId}`,
      cloWeights: [
        { clo_id: cloMapped, weight: 0.5 },
        { clo_id: cloOrphan, weight: 0.5 },
      ],
      scorePercent: 80,
    });
    gradeIds.push(g.gradeId);
    submissionIds.push(g.submissionId);
    assignmentIds.push(g.assignmentId);

    // Mapped sibling rolled up normally…
    const mappedEvidence = await admin
      .from("evidence")
      .select("id")
      .eq("grade_id", g.gradeId)
      .eq("clo_id", cloMapped);
    expect(mappedEvidence.data).toHaveLength(1);

    // …while the orphan produced NO evidence and NO attainment.
    const orphanEvidence = await admin
      .from("evidence")
      .select("id")
      .eq("grade_id", g.gradeId)
      .eq("clo_id", cloOrphan);
    expect(orphanEvidence.data).toHaveLength(0);

    const orphanAtt = await admin
      .from("outcome_attainment")
      .select("id")
      .eq("outcome_id", cloOrphan);
    expect(orphanAtt.data).toHaveLength(0);
  });

  it("case 7 — a course with no grades has no attainment rows (empty evidence)", async () => {
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO nograde ${ctx.runId}`,
    });
    outcomeIds.push(plo);
    const att = await admin
      .from("outcome_attainment")
      .select("id")
      .eq("outcome_id", plo);
    expect(att.data).toHaveLength(0);
  });

  it("case 8 — duplicate mappings are rejected by the unique pair constraint", async () => {
    const plo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      type: "PLO",
      title: `Cascade PLO dup ${ctx.runId}`,
    });
    const clo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      programId: ctx.programId,
      courseId: ctx.courseId,
      type: "CLO",
      title: `Cascade CLO dup ${ctx.runId}`,
    });
    mappingIds.push(await insertMapping(admin, plo, clo, 1));
    outcomeIds.push(plo, clo);

    const duplicate = await admin.from("outcome_mappings").insert({
      source_outcome_id: plo,
      target_outcome_id: clo,
      weight: 1,
    });
    expect(duplicate.error).not.toBeNull();
  });

  it("case 9 — institution isolation: cross-institution mapping rejected", async () => {
    const ilo = await insertOutcome(admin, {
      institutionId: ctx.institutionId,
      type: "ILO",
      title: `Cascade ILO iso ${ctx.runId}`,
    });
    outcomeIds.push(ilo);

    const foreignInstitution = await admin
      .from("institutions")
      .insert({
        name: `Cascade Foreign ${ctx.runId}`,
        slug: `cascade-foreign-${ctx.runId}`,
        join_mode: "open",
      })
      .select("id")
      .single();
    if (foreignInstitution.error || !foreignInstitution.data) {
      throw new Error(foreignInstitution.error?.message);
    }
    foreignInstitutionId = foreignInstitution.data.id;

    const foreignProgram = await admin
      .from("programs")
      .insert({
        institution_id: foreignInstitutionId,
        name: `Cascade Foreign Program ${ctx.runId}`,
        code: `CF-${ctx.runId.slice(0, 8)}`,
      })
      .select("id")
      .single();
    if (foreignProgram.error || !foreignProgram.data) {
      throw new Error(foreignProgram.error?.message);
    }
    foreignProgramId = foreignProgram.data.id;

    const foreignPlo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: foreignInstitutionId,
        program_id: foreignProgramId,
        title: `Cascade Foreign PLO ${ctx.runId}`,
        type: "PLO",
      })
      .select("id")
      .single();
    if (foreignPlo.error || !foreignPlo.data) {
      throw new Error(foreignPlo.error?.message);
    }
    foreignPloId = foreignPlo.data.id;

    const cross = await admin.from("outcome_mappings").insert({
      source_outcome_id: ilo,
      target_outcome_id: foreignPloId,
      weight: 1,
    });
    expect(cross.error).not.toBeNull();
  });
});
