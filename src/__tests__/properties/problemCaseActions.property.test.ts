// Feature: 8.9 deterministic intervention draft planning, Property tests
// ==============================================================================
//   Property 1: citations are the case's own evidence array (citation ⊆
//               authorized evidence set — never recomputed or invented)
//   Property 2: the recommended owner is ALWAYS one of the three routing
//               targets, for any cause string (total routing, no dead ends)
//   Property 3: determinism — building a plan twice yields identical output
// Minimum 100 iterations per property (fast-check).
// ==============================================================================

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  buildInterventionDraftPlan,
  KNOWN_CAUSES,
  type ProblemCaseInput,
  type RecommendedOwner,
} from "@/lib/problemCaseActions";

const OWNERS: RecommendedOwner[] = [
  "teacher",
  "coordinator",
  "student_support",
];

const causeArb = fc.oneof(
  fc.constantFrom(...KNOWN_CAUSES),
  fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => !(KNOWN_CAUSES as readonly string[]).includes(s))
);

const evidenceArb = fc.array(
  fc.record({
    source: fc.constant("outcome_attainment"),
    clo_id: fc.uuid(),
    course_avg: fc.double({ min: 0, max: 100, noNaN: true }),
  }),
  { maxLength: 5 }
);

const caseArb: fc.Arbitrary<ProblemCaseInput> = fc.record({
  clo_id: fc.uuid(),
  clo_title: fc.string({ minLength: 1, maxLength: 80 }),
  dominant_cause: causeArb,
  evidence: evidenceArb,
});

describe("problemCaseActions — Property 1: citations ⊆ authorized evidence", () => {
  it("P1: the draft's citations are exactly the case's evidence array", () => {
    fc.assert(
      fc.property(caseArb, (problemCase) => {
        const draft = buildInterventionDraftPlan(problemCase);
        expect(draft.citations).toEqual(problemCase.evidence);
        // Same reference — the citation set is the authorized set itself.
        expect(draft.citations).toBe(problemCase.evidence);
      }),
      { numRuns: 100 }
    );
  });
});

describe("problemCaseActions — Property 2: total ownership routing", () => {
  it("P2: the owner is always one of the three routing targets", () => {
    fc.assert(
      fc.property(caseArb, (problemCase) => {
        const draft = buildInterventionDraftPlan(problemCase);
        expect(OWNERS).toContain(draft.recommended_owner);
      }),
      { numRuns: 100 }
    );
  });
});

describe("problemCaseActions — Property 3: determinism", () => {
  it("P3: same input → identical plan (no randomness, no clock)", () => {
    fc.assert(
      fc.property(caseArb, (problemCase) => {
        const a = buildInterventionDraftPlan(problemCase);
        const b = buildInterventionDraftPlan(problemCase);
        expect(a).toEqual(b);
      }),
      { numRuns: 100 }
    );
  });
});
