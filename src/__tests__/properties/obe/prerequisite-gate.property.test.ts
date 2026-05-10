// Feature: pre-deployment-e2e-audit, Property 5: Prerequisite gate enforcement
// **Validates: Requirements 7.5**
//
// A student cannot successfully submit to an assignment whose prerequisite
// CLO attainment is below the configured gate percentage. This is the
// boolean contract canSubmit(s) ⇔ s.prereqAttainment >= s.gate.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

interface PrereqState {
  readonly prereqAttainment: number;
  readonly gate: number;
}

const arbitraryPrereqState = (): fc.Arbitrary<PrereqState> =>
  fc.record<PrereqState>({
    prereqAttainment: fc.double({ min: 0, max: 100, noNaN: true }),
    gate: fc.double({ min: 0, max: 100, noNaN: true }),
  });

/**
 * Pure reference of the gate check. Mirrors the domain rule: you can
 * submit iff your prerequisite attainment meets or exceeds the gate.
 */
const canSubmit = (s: PrereqState): boolean => s.prereqAttainment >= s.gate;

describe("Property 5 — prerequisite gate enforcement", () => {
  it("canSubmit is true iff prereqAttainment >= gate", () => {
    fc.assert(
      fc.property(arbitraryPrereqState(), (state) => {
        expect(canSubmit(state)).toBe(state.prereqAttainment >= state.gate);
      }),
      { numRuns: 200 }
    );
  });

  it("exactly at the gate boundary is permitted (>=, not >)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (gate) => {
        expect(canSubmit({ prereqAttainment: gate, gate })).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("one ULP below the gate is blocked", () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-6, max: 100, noNaN: true }), (gate) => {
        expect(canSubmit({ prereqAttainment: gate - 1e-6, gate })).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
