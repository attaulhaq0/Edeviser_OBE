import { describe, expect, it } from "vitest";

import { parseAuthorizedCqiCoordinatorDraft } from "../../../supabase/functions/_shared/ai/cqi-draft";

const evidence = new Set(["snapshot-1", "outcome-1"]);
const validDraft = {
  problemStatement: "CLO attainment is below the institution threshold.",
  outcomeContext: "CLO Data Modelling, Program A.",
  baseline: 58.6,
  target: 70,
  proposedImprovement: "Add an assessed formative exercise.",
  rationale: "The authorised outcome snapshot shows a repeated cohort gap.",
  responsibleOwner: "Program coordinator",
  measurementPlan:
    "Evaluate the next scheduled cohort with canonical attainment.",
  measurementWindow: "The next scheduled assessment window.",
  successCriterion:
    "Attainment reaches the approved target with adequate evidence.",
  citations: ["snapshot-1", "outcome-1"],
};

describe("Coordinator CQI typed draft boundary", () => {
  it("accepts only a complete typed draft with authorised citations", () => {
    expect(
      parseAuthorizedCqiCoordinatorDraft(JSON.stringify(validDraft), evidence)
    ).toEqual(validDraft);
  });

  it("fails closed for malformed, hallucinated, or undeclared official output", () => {
    expect(parseAuthorizedCqiCoordinatorDraft("not json", evidence)).toBeNull();
    expect(
      parseAuthorizedCqiCoordinatorDraft(
        JSON.stringify({ ...validDraft, citations: ["invented"] }),
        evidence
      )
    ).toBeNull();
    expect(
      parseAuthorizedCqiCoordinatorDraft(
        JSON.stringify({ ...validDraft, officialAttainment: 99 }),
        evidence
      )
    ).toBeNull();
  });
});
