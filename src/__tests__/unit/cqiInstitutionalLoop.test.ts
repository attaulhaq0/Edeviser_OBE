import { describe, expect, it } from "vitest";

import {
  CQI_PATTERN_TRIGGER_VERSION,
  detectSystemicOutcomePattern,
  mayCreateCqiProposal,
  measureCqiEffect,
  measureComparableCqiEffect,
  parseAuthorizedCqiDraft,
  type OutcomeEvidencePoint,
  type OutcomeScope,
} from "@/lib/cqiInstitutionalLoop";

const scope: OutcomeScope = {
  institutionId: "institution-a",
  programId: "program-a",
  courseId: "course-a",
  outcomeId: "clo-data-modelling",
  outcomeType: "CLO",
  policyVersion: "attainment-v1",
  windowStart: "2026-08-01T00:00:00.000Z",
  windowEnd: "2026-08-31T23:59:59.999Z",
};

const config = {
  minimumSampleSize: 5,
  minimumAffectedStudents: 3,
  attainmentThreshold: 70,
  severityGap: { moderate: 5, high: 15 },
};

const weakEvidence: OutcomeEvidencePoint[] = [
  ["a", "student-1", 50],
  ["b", "student-2", 52],
  ["c", "student-3", 55],
  ["d", "student-4", 67],
  ["e", "student-5", 69],
].map(([evidenceId, studentId, attainment]) => ({
  evidenceId: String(evidenceId),
  studentId: String(studentId),
  attainment: Number(attainment),
  observedAt: "2026-08-15T10:00:00.000Z",
}));

describe("CQI institutional closed loop", () => {
  // Feature: CQI institutional intelligence, Property 1: systemic detection is deterministic.
  it("creates a traceable CLO pattern only for a sufficiently broad weak cohort", () => {
    const pattern = detectSystemicOutcomePattern(scope, weakEvidence, config);

    expect(pattern).toMatchObject({
      triggerVersion: CQI_PATTERN_TRIGGER_VERSION,
      outcomeType: "CLO",
      baseline: 58.6,
      currentValue: 58.6,
      sampleSize: 5,
      affectedPopulation: 5,
      severity: "moderate",
    });
    expect(pattern?.evidenceReferences).toEqual(["a", "b", "c", "d", "e"]);
    expect(pattern?.identity).toContain("clo-data-modelling");
  });

  it("never escalates a single student or a tiny sample into CQI", () => {
    expect(
      detectSystemicOutcomePattern(scope, weakEvidence.slice(0, 1), config)
    ).toBeNull();
    expect(
      detectSystemicOutcomePattern(
        scope,
        Array.from({ length: 5 }, (_, index) => ({
          evidenceId: `repeat-${index}`,
          studentId: "student-1",
          attainment: 40,
          observedAt: "2026-08-15T10:00:00.000Z",
        })),
        config
      )
    ).toBeNull();
  });

  it("keeps outcome hierarchy context and produces a stable versioned identity", () => {
    const ploPattern = detectSystemicOutcomePattern(
      { ...scope, courseId: undefined, outcomeId: "plo-1", outcomeType: "PLO" },
      weakEvidence,
      config
    );
    const iloPattern = detectSystemicOutcomePattern(
      { ...scope, courseId: undefined, outcomeId: "ilo-1", outcomeType: "ILO" },
      weakEvidence,
      config
    );
    expect(ploPattern?.identity).not.toBe(iloPattern?.identity);
    expect(ploPattern?.outcomeType).toBe("PLO");
    expect(iloPattern?.outcomeType).toBe("ILO");
    expect(ploPattern?.identity).toContain(scope.windowStart);
    expect(ploPattern?.identity).toContain(scope.policyVersion);
    expect(ploPattern?.occurrenceVersion).toContain(scope.windowStart);
  });

  it("uses only evidence from the declared window and preserves an official baseline", () => {
    const pattern = detectSystemicOutcomePattern(
      scope,
      [
        ...weakEvidence,
        {
          evidenceId: "outside-window",
          studentId: "student-6",
          attainment: 0,
          observedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      { ...config, baselineAttainment: 72 }
    );

    expect(pattern?.sampleSize).toBe(5);
    expect(pattern?.baseline).toBe(72);
    expect(pattern?.evidenceReferences).not.toContain("outside-window");
  });

  it("prevents duplicate CQI proposals during cooldown or for an unchanged occurrence", () => {
    const base = {
      patternIdentity: "institution:program:CLO:outcome",
      occurrenceVersion: "v1",
      now: "2026-08-18T12:00:00.000Z",
      hasOpenPlan: false,
      hasExistingProposalForOccurrence: false,
    };
    expect(mayCreateCqiProposal(base)).toBe(true);
    expect(
      mayCreateCqiProposal({
        ...base,
        cooldownUntil: "2026-08-19T12:00:00.000Z",
      })
    ).toBe(false);
    expect(
      mayCreateCqiProposal({ ...base, hasExistingProposalForOccurrence: true })
    ).toBe(false);
    expect(mayCreateCqiProposal({ ...base, hasOpenPlan: true })).toBe(false);
  });

  it("measures CQI deterministically without allowing an explanation to supply the result", () => {
    expect(
      measureCqiEffect({
        baselineMetric: 58.6,
        postActionMetric: null,
        evidenceCount: 1,
        materialChange: 5,
      }).state
    ).toBe("PENDING");
    expect(
      measureCqiEffect({
        baselineMetric: 58.6,
        postActionMetric: 67,
        evidenceCount: 5,
        materialChange: 5,
      })
    ).toEqual({ delta: 8.4, state: "IMPROVED" });
    expect(
      measureCqiEffect({
        baselineMetric: 58.6,
        postActionMetric: 54,
        evidenceCount: 5,
        materialChange: 5,
      }).state
    ).toBe("NO_MATERIAL_CHANGE");
    expect(
      measureCqiEffect({
        baselineMetric: 58.6,
        postActionMetric: 50,
        evidenceCount: 5,
        materialChange: 5,
      }).state
    ).toBe("DECLINED");
    expect(
      measureCqiEffect({
        baselineMetric: 58.6,
        postActionMetric: 67,
        evidenceCount: 0,
        materialChange: 5,
      }).state
    ).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("requires comparable outcome, tenant, cohort, denominator, method, and evidence", () => {
    const before = {
      institutionId: "institution-a",
      programId: "program-a",
      courseId: "course-a",
      outcomeId: "clo-data-modelling",
      measurementMethodVersion: "attainment-v1",
      cohortSemantics: "enrolled-students",
      denominatorSemantics: "students-with-evidence",
      evidenceCount: 5,
      minimumEvidenceCount: 5,
    };
    const input = {
      baselineMetric: 58.6,
      postActionMetric: 67,
      evidenceCount: 5,
      materialChange: 5,
    };
    expect(
      measureComparableCqiEffect(input, before, { ...before, evidenceCount: 6 })
        .state
    ).toBe("IMPROVED");
    expect(
      measureComparableCqiEffect(input, before, {
        ...before,
        outcomeId: "other",
      }).state
    ).toBe("INSUFFICIENT_EVIDENCE");
    expect(
      measureComparableCqiEffect(input, before, {
        ...before,
        institutionId: "institution-b",
      }).state
    ).toBe("INSUFFICIENT_EVIDENCE");
    expect(
      measureComparableCqiEffect(input, before, {
        ...before,
        denominatorSemantics: "all-enrolled",
      }).state
    ).toBe("INSUFFICIENT_EVIDENCE");
    expect(
      measureComparableCqiEffect(input, before, { ...before, evidenceCount: 4 })
        .state
    ).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("fails closed on unauthorized citations or AI-authored official metrics", () => {
    const draft = {
      problemStatement: "CLO attainment is below the defined threshold.",
      outcomeContext: "CLO Data Modelling in Program A.",
      baseline: 58.6,
      target: 70,
      proposedImprovement: "Add a scaffolded formative exercise.",
      rationale: "The cited cohort evidence identifies a repeated gap.",
      responsibleOwner: "Program coordinator",
      measurementPlan:
        "Measure the next cohort using the canonical aggregation.",
      measurementWindow: "The next scheduled assessment window.",
      successCriterion: "CLO attainment reaches the authorised target.",
      citations: ["a", "b"],
    };
    expect(parseAuthorizedCqiDraft(draft, ["a", "b", "c"])).toEqual(draft);
    expect(
      parseAuthorizedCqiDraft({ ...draft, citations: ["other"] }, ["a"])
    ).toBeNull();
    expect(
      parseAuthorizedCqiDraft({ ...draft, officialAttainment: 99 }, ["a", "b"])
    ).toBeNull();
    expect(
      parseAuthorizedCqiDraft({ ...draft, target: 50 }, ["a", "b"])
    ).toBeNull();
  });
});
