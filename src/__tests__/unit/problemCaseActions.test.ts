// =============================================================================
// problemCaseActions — 8.9 decision-stack unit tests (Q4/Q5/Q7/Q8)
//
// Feature: continuous-verification — 8.9-QA decision-stack suite
//   Q4 what-intervention: deterministic, CITED draft + approval gate
//   Q5 who-performs:      cause → owner routing (mirrors the SQL engine)
//   Q7 change-curriculum: curriculum-design cause → CQI recommendation
//   Q8 problem-class:     the 5-class taxonomy is total (no dead ends)
// The builder is pure: same input → same output. No AI anywhere.
// =============================================================================

import { describe, expect, it } from "vitest";

import {
  buildInterventionDraftPlan,
  KNOWN_CAUSES,
  OWNER_BY_CAUSE,
  ownerForCause,
  type ProblemCaseInput,
} from "@/lib/problemCaseActions";

const BASE_CASE: ProblemCaseInput = {
  clo_id: "clo-1",
  clo_title: "Recall key concepts in Science",
  dominant_cause: "student-signal",
  evidence: [
    { source: "outcome_attainment", clo_id: "clo-1", course_avg: 46.8 },
  ],
};

describe("8.9-QA Q4 — what intervention (cited draft + approval gate)", () => {
  it("citations are exactly the case's authorized evidence (never recomputed)", () => {
    const draft = buildInterventionDraftPlan(BASE_CASE);
    expect(draft.citations).toEqual(BASE_CASE.evidence);
    expect(draft.citations).toHaveLength(BASE_CASE.evidence.length);
    expect(draft.citations[0]).toBe(BASE_CASE.evidence[0]);
  });

  it("every draft is approval-gated (official-record mutation guard)", () => {
    for (const cause of KNOWN_CAUSES) {
      const draft = buildInterventionDraftPlan({
        ...BASE_CASE,
        dominant_cause: cause,
      });
      expect(draft.approval_required).toBe(true);
    }
  });

  it("is deterministic — same input produces an identical plan", () => {
    const a = buildInterventionDraftPlan(BASE_CASE);
    const b = buildInterventionDraftPlan(BASE_CASE);
    expect(a).toEqual(b);
  });

  it("every known cause yields at least one suggested action", () => {
    for (const cause of KNOWN_CAUSES) {
      const draft = buildInterventionDraftPlan({
        ...BASE_CASE,
        dominant_cause: cause,
      });
      expect(draft.action_keys.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("8.9-QA Q5 — who performs it (ownership routing)", () => {
  it("routes each dominant cause to the engine's owner", () => {
    expect(ownerForCause("student-signal")).toBe("student_support");
    expect(ownerForCause("teacher-signal")).toBe("coordinator");
    expect(ownerForCause("assessment-signal")).toBe("teacher");
    expect(ownerForCause("prerequisite-signal")).toBe("teacher");
    expect(ownerForCause("curriculum-design-signal")).toBe("coordinator");
  });

  it("the routing table covers all five canonical classes", () => {
    for (const cause of KNOWN_CAUSES) {
      expect(OWNER_BY_CAUSE[cause]).toBeDefined();
    }
  });

  it("unknown causes fail safe to the teacher (no dead-end routing)", () => {
    expect(ownerForCause("future-unknown-signal")).toBe("teacher");
  });
});

describe("8.9-QA Q7 — should we change the curriculum", () => {
  it("recommends the CQI curriculum-change path only for curriculum-design", () => {
    const curriculum = buildInterventionDraftPlan({
      ...BASE_CASE,
      dominant_cause: "curriculum-design-signal",
    });
    expect(curriculum.curriculum_change_recommended).toBe(true);
    expect(curriculum.action_keys).toContain("open_cqi_pattern");
    expect(curriculum.action_keys).toContain("review_curriculum_design");

    for (const cause of KNOWN_CAUSES.filter(
      (c) => c !== "curriculum-design-signal"
    )) {
      const draft = buildInterventionDraftPlan({
        ...BASE_CASE,
        dominant_cause: cause,
      });
      expect(draft.curriculum_change_recommended).toBe(false);
    }
  });
});

describe("8.9-QA Q8 — problem-class taxonomy is total", () => {
  it("produces a plan with a headline key for every canonical class", () => {
    for (const cause of KNOWN_CAUSES) {
      const draft = buildInterventionDraftPlan({
        ...BASE_CASE,
        dominant_cause: cause,
      });
      expect(draft.headline_key).toBe(`unitClose.draft.headline.${cause}`);
      expect(draft.recommended_owner).toBeDefined();
    }
  });

  it("falls back to the generic headline for unknown classes", () => {
    const draft = buildInterventionDraftPlan({
      ...BASE_CASE,
      dominant_cause: "not-yet-classified",
    });
    expect(draft.headline_key).toBe("unitClose.draft.headline.generic");
  });

  it("carries the case identity through unchanged", () => {
    const draft = buildInterventionDraftPlan(BASE_CASE);
    expect(draft.clo_id).toBe(BASE_CASE.clo_id);
    expect(draft.clo_title).toBe(BASE_CASE.clo_title);
    expect(draft.dominant_cause).toBe(BASE_CASE.dominant_cause);
  });
});
