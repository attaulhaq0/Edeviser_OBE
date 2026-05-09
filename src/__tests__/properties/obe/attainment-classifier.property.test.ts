// Feature: pre-deployment-e2e-audit, Property 4: Attainment classifier is total and deterministic
// **Validates: Requirements 7.4**
//
// The classifier must be total on [0, 100] — every percentage maps to
// exactly one label — and deterministic — the same input always yields
// the same label. Also covers Correctness Property 15 (classify is
// idempotent).

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { classifyAttainment } from "@/lib/attainmentClassifier";

const VALID_LABELS = [
  "Excellent",
  "Satisfactory",
  "Developing",
  "Not_Yet",
] as const;

describe("Property 4 — attainment classifier is total and deterministic", () => {
  it("returns one of the four valid labels for every percent in [0, 100]", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (percent) => {
        const label = classifyAttainment(percent);
        expect(VALID_LABELS).toContain(label);
      }),
      { numRuns: 200 }
    );
  });

  it("is deterministic — same input always yields the same label", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (percent) => {
        expect(classifyAttainment(percent)).toBe(classifyAttainment(percent));
      }),
      { numRuns: 100 }
    );
  });

  it("respects documented default thresholds — 85 = Excellent, 70 = Satisfactory, 50 = Developing, <50 = Not_Yet", () => {
    expect(classifyAttainment(100)).toBe("Excellent");
    expect(classifyAttainment(85)).toBe("Excellent");
    expect(classifyAttainment(84.9)).toBe("Satisfactory");
    expect(classifyAttainment(70)).toBe("Satisfactory");
    expect(classifyAttainment(69.9)).toBe("Developing");
    expect(classifyAttainment(50)).toBe("Developing");
    expect(classifyAttainment(49.9)).toBe("Not_Yet");
    expect(classifyAttainment(0)).toBe("Not_Yet");
  });
});
