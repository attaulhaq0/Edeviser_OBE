import { describe, expect, it } from "vitest";

import {
  EVALUATOR_OUTPUT_SCHEMA,
  parseEvaluatorAssessment,
} from "../../../supabase/functions/_shared/ai/evaluator";

describe("typed Evaluator output", () => {
  it("preserves before/action/after citations and recommendation", () => {
    const result = parseEvaluatorAssessment(JSON.stringify({
      beforeEvidence: [{ kind: "outcome", id: "before-1" }],
      actionEvidence: [{ kind: "record", id: "execution-1" }],
      afterEvidence: [{ kind: "calculation", id: "measurement-1" }],
      effectExplanation: "Attainment improved after the executed support.",
      recommendation: "continue",
      nextInterventionDraft: "Continue the same support window.",
    }));
    expect(result?.recommendation).toBe("continue");
    expect(result?.beforeEvidence[0]?.id).toBe("before-1");
    expect(EVALUATOR_OUTPUT_SCHEMA.required).toContain("afterEvidence");
  });

  it("rejects output that attempts to provide official metrics", () => {
    expect(
      parseEvaluatorAssessment(JSON.stringify({
        beforeEvidence: [],
        actionEvidence: [],
        afterEvidence: [],
        effectExplanation: "changed",
        recommendation: "continue",
        officialDelta: 99,
      }))
    ).toBeNull();
  });
});

