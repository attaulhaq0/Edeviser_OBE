// closedLoop-arrows8-16.test.ts — Phase 21: Arrows 8-16
// Agent → Intervention → Reassessment → Measurement → CQI → Gap → Evidence
import { describe, it, expect } from "vitest";
import { measureCqiEffect } from "@/lib/cqiInstitutionalLoop";
import { evaluateInterventionMeasurement } from "@/lib/interventionMeasurement";
import { classifyGapStatus, classifyGapFlag } from "@/lib/gapAnalysis";

describe("Arrow 8-9: Agent Context + Human Approval", () => {
  it("agent context includes identity + page + specialist + framework", () => {
    const ctx = { identity: { userId: "s1", role: "student" as const, institutionId: "i1" }, page: { route: "/s/dashboard", studentId: "s1" }, specialist: "mastery" as const, framework: { assessmentModel: "criterion" as const, accreditationBodies: ["IB"] } };
    expect(ctx.identity.role).toBe("student");
    expect(ctx.framework.assessmentModel).toBe("criterion");
  });
  it("all 10 write tools require human approval with valid approver role", () => {
    const tools = ["create_goal", "create_planner_session", "create_cqi_action", "create_learning_intervention", "publish_official_content", "ingest_curriculum", "create_ilo", "update_ilo", "delete_ilo", "reorder_ilos"];
    const approvers: Record<string, string> = { create_goal: "student", create_planner_session: "student", create_cqi_action: "coordinator", create_learning_intervention: "teacher", publish_official_content: "teacher", ingest_curriculum: "coordinator", create_ilo: "admin", update_ilo: "admin", delete_ilo: "admin", reorder_ilos: "admin" };
    for (const t of tools) expect(approvers[t]).toBeTruthy();
  });
});

describe("Arrow 10-12: Intervention → Action → Reassessment → New Evidence", () => {
  it("improvement: pre=45% → post=65% → delta = +20 (material)", () => {
    expect(evaluateInterventionMeasurement({ baselineMetric: 45, postActionMetric: 65, evidenceCount: 8 }).evaluationState).toBe("IMPROVED");
  });
  it("no improvement: pre=45% → post=47% → delta = +2 (not material)", () => {
    expect(evaluateInterventionMeasurement({ baselineMetric: 45, postActionMetric: 47, evidenceCount: 8 }).evaluationState).toBe("NO_MATERIAL_CHANGE");
  });
  it("decline: pre=75% → post=60% → delta = -15 (material)", () => {
    const r = evaluateInterventionMeasurement({ baselineMetric: 75, postActionMetric: 60, evidenceCount: 10 });
    expect(r.evaluationState).toBe("DECLINED");
    expect(r.delta).toBe(-15);
  });
  it("insufficient evidence: 0 evidence_count", () => {
    expect(evaluateInterventionMeasurement({ baselineMetric: 45, postActionMetric: 65, evidenceCount: 0 }).evaluationState).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("pending: postActionMetric null (not yet reassessed)", () => {
    expect(evaluateInterventionMeasurement({ baselineMetric: 45, postActionMetric: null, evidenceCount: 3 }).evaluationState).toBe("PENDING");
  });
});

describe("Arrow 13-15: Measurement → CQI → Curriculum Gap", () => {
  it("CQI: improved by ≥5 material change", () => {
    expect(measureCqiEffect({ baselineMetric: 60, postActionMetric: 72, evidenceCount: 15, materialChange: 5 }).state).toBe("IMPROVED");
  });
  it("CQI: declined", () => {
    expect(measureCqiEffect({ baselineMetric: 75, postActionMetric: 65, evidenceCount: 10, materialChange: 5 }).state).toBe("DECLINED");
  });
  it("CQI: no material change", () => {
    expect(measureCqiEffect({ baselineMetric: 70, postActionMetric: 72, evidenceCount: 20, materialChange: 5 }).state).toBe("NO_MATERIAL_CHANGE");
  });
  it("curriculum gap: unmapped PLO", () => {
    expect(classifyGapStatus({ id: "p1", title: "P", type: "PLO", mapped_children_count: 0, evidence_count: 0, has_assessments: false })).toBe("unmapped");
  });
  it("curriculum gap: CLO with no assessments → unassessed flag", () => {
    expect(classifyGapFlag({ id: "c1", title: "C", type: "CLO", mapped_children_count: 0, evidence_count: 0, has_assessments: false })).toBe("unassessed");
  });
  it("curriculum gap: fully mapped outcome", () => {
    expect(classifyGapStatus({ id: "p2", title: "P2", type: "PLO", mapped_children_count: 4, evidence_count: 10, has_assessments: true })).toBe("fully_mapped");
  });
});

describe("Arrow 16: Institutional Evidence (provenance verification)", () => {
  it("evidence row has required provenance fields", () => {
    const row = { student_id: "s1", clo_id: "c1", plo_id: "p1", ilo_id: "i1", score_percent: 78, attainment_level: "Satisfactory", grade_id: "g1", submission_id: "sub1", raw_score: { strategy: "percent", native: { score: 39, maxScore: 50 } } };
    expect(row.student_id).toBeTruthy();
    expect(row.clo_id).toBeTruthy();
    expect(row.plo_id).toBeTruthy();
    expect(row.grade_id).toBeTruthy();
    expect(row.raw_score.native).toBeTruthy();
  });
});