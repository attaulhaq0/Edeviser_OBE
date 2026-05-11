// Feature: team-challenges, Property 29: Health score formula
// Feature: team-challenges, Property 30: Health status classification
// Feature: team-challenges, Property 32: Gini coefficient bounds
// **Validates: Requirements 37.1, 37.2, 38.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeGiniCoefficient,
  computeTeamHealth,
  classifyHealthStatus,
  trendToScore,
  detectEngagementTrend,
  type TeamHealthInput,
} from "@/lib/teamHealthCalculator";

// ── Generators ───────────────────────────────────────────────────────────────

const healthInputArb: fc.Arbitrary<TeamHealthInput> = fc.record({
  memberXpContributions: fc.array(fc.integer({ min: 0, max: 1000 }), {
    minLength: 2,
    maxLength: 6,
  }),
  thisWeekXp: fc.integer({ min: 0, max: 5000 }),
  lastWeekXp: fc.integer({ min: 0, max: 5000 }),
  participationRate: fc.double({ min: 0, max: 1, noNaN: true }),
  overlapRate: fc.double({ min: 0, max: 1, noNaN: true }),
});

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 29: Team Health Score formula correctness", () => {
  it("health score is between 0 and 100", () => {
    fc.assert(
      fc.property(healthInputArb, (input) => {
        const result = computeTeamHealth(input);
        expect(result.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.healthScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it("health score follows the weighted formula", () => {
    fc.assert(
      fc.property(healthInputArb, (input) => {
        const result = computeTeamHealth(input);
        const gini = computeGiniCoefficient(input.memberXpContributions);
        const trend = detectEngagementTrend(input.thisWeekXp, input.lastWeekXp);
        const tScore = trendToScore(trend);
        const participation = Math.max(0, Math.min(1, input.participationRate));
        const overlap = Math.max(0, Math.min(1, input.overlapRate));

        const expected = Math.round(
          Math.max(
            0,
            Math.min(
              100,
              0.3 * (1 - gini) * 100 +
                0.25 * tScore +
                0.25 * participation * 100 +
                0.2 * overlap * 100
            )
          )
        );
        expect(result.healthScore).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 30: Health status classification", () => {
  it("score ≥70 → healthy", () => {
    fc.assert(
      fc.property(fc.integer({ min: 70, max: 100 }), (score) => {
        expect(classifyHealthStatus(score)).toBe("healthy");
      }),
      { numRuns: 100 }
    );
  });

  it("score 40-69 → needs_attention", () => {
    fc.assert(
      fc.property(fc.integer({ min: 40, max: 69 }), (score) => {
        expect(classifyHealthStatus(score)).toBe("needs_attention");
      }),
      { numRuns: 100 }
    );
  });

  it("score <40 → at_risk", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 39 }), (score) => {
        expect(classifyHealthStatus(score)).toBe("at_risk");
      }),
      { numRuns: 100 }
    );
  });

  it("classification is consistent with computed score", () => {
    fc.assert(
      fc.property(healthInputArb, (input) => {
        const result = computeTeamHealth(input);
        expect(result.healthStatus).toBe(
          classifyHealthStatus(result.healthScore)
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 32: Gini coefficient bounds", () => {
  it("Gini is between 0 and 1 for teams with 2+ members", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), {
          minLength: 2,
          maxLength: 6,
        }),
        (values) => {
          const gini = computeGiniCoefficient(values);
          expect(gini).toBeGreaterThanOrEqual(0);
          expect(gini).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("equal contributions yield Gini of 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 1, max: 500 }),
        (count, value) => {
          const values = Array(count).fill(value) as number[];
          expect(computeGiniCoefficient(values)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("single member yields Gini of 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (value) => {
        expect(computeGiniCoefficient([value])).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("all-zero contributions yield Gini of 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (count) => {
        const values = Array(count).fill(0) as number[];
        expect(computeGiniCoefficient(values)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
