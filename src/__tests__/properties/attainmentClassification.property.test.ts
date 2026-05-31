// Feature: student-experience-remediation, Property 1: Attainment classification banding and color agree, with the 50% boundary as Developing
// **Validates: Requirements 8.2, 8.3**
//
// For any percent value in the range 0–100 and any valid threshold configuration
// where `excellent > satisfactory > developing`, `classifyAttainment(percent)`
// returns exactly one band; the band uses inclusive lower bounds (`>=`) so that a
// value of exactly 50 (the default `developing` threshold) classifies as
// **Developing** and any value strictly below 50 classifies as **Not_Yet**,
// exactly 70 classifies as **Satisfactory**, and exactly 85 classifies as
// **Excellent**; and the color/text/badge helpers (`getAttainmentColor`,
// `getAttainmentTextClass`, `getAttainmentBadgeStyle`) return the style belonging
// to the same band that `classifyAttainment` returns for that percent.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  classifyAttainment,
  getAttainmentColor,
  getAttainmentTextClass,
  getAttainmentBadgeStyle,
} from "@/lib/attainmentClassifier";
import {
  DEFAULT_ATTAINMENT_THRESHOLDS,
  type AttainmentLevel,
  type AttainmentThresholdsConfig,
} from "@/types/app";

const ALL_BANDS: readonly AttainmentLevel[] = [
  "Excellent",
  "Satisfactory",
  "Developing",
  "Not_Yet",
];

/**
 * Generates a valid threshold configuration where
 * `excellent > satisfactory > developing` and `developing >= 1`, so that
 * `developing - 1 >= 0` is a valid "below developing" percent (Not_Yet).
 */
const thresholdsArb: fc.Arbitrary<AttainmentThresholdsConfig> = fc
  .uniqueArray(fc.integer({ min: 1, max: 99 }), {
    minLength: 3,
    maxLength: 3,
  })
  .map((values) => {
    const [developing, satisfactory, excellent] = [...values].sort(
      (a, b) => a - b
    );
    if (
      developing === undefined ||
      satisfactory === undefined ||
      excellent === undefined
    ) {
      throw new Error("thresholdsArb expects exactly three values");
    }
    return { excellent, satisfactory, developing };
  });

/** Any displayable attainment percentage (non-negative; no "no data" sentinel). */
const percentArb = fc.double({ min: 0, max: 100, noNaN: true });

describe("attainmentClassifier — Property 1: banding and color agree", () => {
  it("P1a: classifyAttainment always returns exactly one of the four bands", () => {
    fc.assert(
      fc.property(percentArb, thresholdsArb, (percent, thresholds) => {
        const band = classifyAttainment(percent, thresholds);
        expect(ALL_BANDS).toContain(band);
      }),
      { numRuns: 200 }
    );
  });

  it("P1b: inclusive lower bounds under DEFAULT thresholds (50→Developing, <50→Not_Yet, 70→Satisfactory, 85→Excellent)", () => {
    // Explicit boundary assertions called out by the property.
    expect(classifyAttainment(85)).toBe("Excellent");
    expect(classifyAttainment(70)).toBe("Satisfactory");
    expect(classifyAttainment(50)).toBe("Developing");

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.9999, noNaN: true }),
        (percent) => {
          // Strictly below the default developing threshold (50) → Not_Yet.
          expect(classifyAttainment(percent)).toBe("Not_Yet");
        }
      ),
      { numRuns: 200 }
    );
  });

  it("P1c: inclusive lower bounds hold for any valid threshold configuration", () => {
    fc.assert(
      fc.property(thresholdsArb, (thresholds) => {
        const { excellent, satisfactory, developing } = thresholds;
        // Exactly at each threshold classifies into that band (inclusive `>=`).
        expect(classifyAttainment(excellent, thresholds)).toBe("Excellent");
        expect(classifyAttainment(satisfactory, thresholds)).toBe(
          "Satisfactory"
        );
        expect(classifyAttainment(developing, thresholds)).toBe("Developing");
        // Strictly below the developing threshold → Not_Yet.
        expect(classifyAttainment(developing - 1, thresholds)).toBe("Not_Yet");
      }),
      { numRuns: 200 }
    );
  });

  it("P1d: each style helper is in one-to-one correspondence with the band (same band ⇔ same style)", () => {
    fc.assert(
      fc.property(
        percentArb,
        percentArb,
        thresholdsArb,
        (p1, p2, thresholds) => {
          const sameBand =
            classifyAttainment(p1, thresholds) ===
            classifyAttainment(p2, thresholds);

          // For non-negative percents the color helper never returns the
          // "no data" sentinel, so style equality must track band equality
          // exactly for all three helpers.
          expect(
            getAttainmentColor(p1, thresholds) ===
              getAttainmentColor(p2, thresholds)
          ).toBe(sameBand);
          expect(
            getAttainmentTextClass(p1, thresholds) ===
              getAttainmentTextClass(p2, thresholds)
          ).toBe(sameBand);
          expect(
            getAttainmentBadgeStyle(p1, thresholds) ===
              getAttainmentBadgeStyle(p2, thresholds)
          ).toBe(sameBand);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("P1e: at the default 50% boundary, classification and styles all agree on Developing", () => {
    const band = classifyAttainment(50, DEFAULT_ATTAINMENT_THRESHOLDS);
    expect(band).toBe("Developing");
    // The style at exactly 50 must equal the style anywhere else in the
    // Developing band (e.g. 60) and differ from the Not_Yet style just below it.
    expect(getAttainmentColor(50)).toBe(getAttainmentColor(60));
    expect(getAttainmentTextClass(50)).toBe(getAttainmentTextClass(60));
    expect(getAttainmentBadgeStyle(50)).toBe(getAttainmentBadgeStyle(60));
    expect(getAttainmentColor(50)).not.toBe(getAttainmentColor(49));
  });
});
