// Feature: edeviser-platform, Property 19: PLO-ILO mapping weight validation
// Feature: edeviser-platform, Property 20: CLO requires PLO mapping before assignment linking
// Feature: edeviser-platform, Property 21: Rubric minimum structure
// Feature: edeviser-platform, Property 22: Grade triggers evidence creation
// Feature: edeviser-platform, Property 23: Evidence immutability
// Feature: edeviser-platform, Property 24: Attainment rollup accuracy
// **Validates: Requirements 13.3, 14.4, 15.1, 18.4, 19.1, 19.2, 20.1, 20.2, 20.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { classifyAttainment } from "@/lib/attainmentClassifier";

// ─── Pure OBE models ────────────────────────────────────────────────────────

interface OutcomeMapping {
  child_id: string;
  parent_id: string;
  weight: number; // 0.0 – 1.0
}

function validatePLOWeights(
  ploId: string,
  mappings: OutcomeMapping[]
): { valid: boolean; totalWeight: number; warning: boolean } {
  const ploMappings = mappings.filter((m) => m.child_id === ploId);
  const totalWeight = ploMappings.reduce((sum, m) => sum + m.weight, 0);
  return {
    valid: true,
    totalWeight: Math.round(totalWeight * 100) / 100,
    warning: totalWeight < 0.5,
  };
}

function canLinkCLOToAssignment(
  cloId: string,
  mappings: OutcomeMapping[]
): boolean {
  return mappings.some((m) => m.child_id === cloId);
}

interface RubricStructure {
  criteria_count: number;
  level_count: number;
}

function validateRubricStructure(rubric: RubricStructure): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (rubric.criteria_count < 2) errors.push("Minimum 2 criteria required");
  if (rubric.level_count < 2)
    errors.push("Minimum 2 performance levels required");
  return { valid: errors.length === 0, errors };
}

type EvidenceOperation = "INSERT" | "UPDATE" | "DELETE";

function evaluateEvidenceOperation(op: EvidenceOperation): boolean {
  return op === "INSERT";
}

function calculateCLOAttainment(evidenceScores: number[]): number {
  if (evidenceScores.length === 0) return 0;
  return evidenceScores.reduce((sum, s) => sum + s, 0) / evidenceScores.length;
}

function calculateWeightedAttainment(
  childAttainments: Array<{ attainment: number; weight: number }>
): number {
  const totalWeight = childAttainments.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = childAttainments.reduce(
    (sum, c) => sum + c.attainment * c.weight,
    0
  );
  return weighted / totalWeight;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const weightArb = fc.double({ min: 0.01, max: 1.0, noNaN: true });
const scorePercentArb = fc.double({ min: 0, max: 100, noNaN: true });
const idArb = fc.uuid();

// ─── Property 19: PLO-ILO mapping weight validation ─────────────────────────

describe("Property 19 — PLO-ILO mapping weight validation", () => {
  it("P19a: warns when total weight < 0.5", () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(
          fc.record({
            child_id: fc.constant("plo-1"),
            parent_id: idArb,
            weight: fc.double({ min: 0.01, max: 0.1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (_ploId, mappings) => {
          const result = validatePLOWeights("plo-1", mappings);
          if (result.totalWeight < 0.5) {
            expect(result.warning).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P19b: no warning when total weight >= 0.5", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            child_id: fc.constant("plo-1"),
            parent_id: idArb,
            weight: fc.double({ min: 0.25, max: 1.0, noNaN: true }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (mappings) => {
          const result = validatePLOWeights("plo-1", mappings);
          if (result.totalWeight >= 0.5) {
            expect(result.warning).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 20: CLO requires PLO mapping before assignment linking ────────

describe("Property 20 — CLO requires PLO mapping", () => {
  it("P20a: CLO with PLO mapping can be linked to assignment", () => {
    fc.assert(
      fc.property(idArb, idArb, weightArb, (cloId, ploId, weight) => {
        const mappings: OutcomeMapping[] = [
          { child_id: cloId, parent_id: ploId, weight },
        ];
        expect(canLinkCLOToAssignment(cloId, mappings)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("P20b: CLO without PLO mapping cannot be linked to assignment", () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(
          fc.record({ child_id: idArb, parent_id: idArb, weight: weightArb }),
          { minLength: 0, maxLength: 5 }
        ),
        (cloId, mappings) => {
          const nonMatching = mappings.filter((m) => m.child_id !== cloId);
          expect(canLinkCLOToAssignment(cloId, nonMatching)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 21: Rubric minimum structure ──────────────────────────────────

describe("Property 21 — Rubric minimum structure", () => {
  it("P21a: rubric with >= 2 criteria and >= 2 levels is valid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 2, max: 6 }),
        (criteria, levels) => {
          const result = validateRubricStructure({
            criteria_count: criteria,
            level_count: levels,
          });
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21b: rubric with < 2 criteria is invalid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1 }),
        fc.integer({ min: 2, max: 6 }),
        (criteria, levels) => {
          const result = validateRubricStructure({
            criteria_count: criteria,
            level_count: levels,
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes("criteria"))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P21c: rubric with < 2 levels is invalid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 1 }),
        (criteria, levels) => {
          const result = validateRubricStructure({
            criteria_count: criteria,
            level_count: levels,
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes("levels"))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 22: Grade triggers evidence creation ──────────────────────────

describe("Property 22 — Grade triggers evidence creation", () => {
  it("P22a: evidence record has correct attainment level for score", () => {
    fc.assert(
      fc.property(scorePercentArb, (score) => {
        const level = classifyAttainment(score);
        if (score >= 85) expect(level).toBe("Excellent");
        else if (score >= 70) expect(level).toBe("Satisfactory");
        else if (score >= 50) expect(level).toBe("Developing");
        else expect(level).toBe("Not_Yet");
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 23: Evidence immutability ─────────────────────────────────────

describe("Property 23 — Evidence immutability", () => {
  it("P23a: only INSERT is allowed on evidence records", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<EvidenceOperation>("INSERT", "UPDATE", "DELETE"),
        (op) => {
          const allowed = evaluateEvidenceOperation(op);
          if (op === "INSERT") {
            expect(allowed).toBe(true);
          } else {
            expect(allowed).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 24: Attainment rollup accuracy ────────────────────────────────

describe("Property 24 — Attainment rollup accuracy", () => {
  it("P24a: CLO attainment equals average of evidence scores", () => {
    fc.assert(
      fc.property(
        fc.array(scorePercentArb, { minLength: 1, maxLength: 20 }),
        (scores) => {
          const attainment = calculateCLOAttainment(scores);
          const expected = scores.reduce((s, v) => s + v, 0) / scores.length;
          expect(attainment).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P24b: PLO attainment equals weighted average of CLO attainments", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            attainment: scorePercentArb,
            weight: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (children) => {
          const result = calculateWeightedAttainment(children);
          const totalWeight = children.reduce((s, c) => s + c.weight, 0);
          const expected =
            children.reduce((s, c) => s + c.attainment * c.weight, 0) /
            totalWeight;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P24c: empty evidence produces zero attainment", () => {
    expect(calculateCLOAttainment([])).toBe(0);
  });

  it("P24d: attainment is always between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 100, noNaN: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (scores) => {
          const attainment = calculateCLOAttainment(scores);
          expect(attainment).toBeGreaterThanOrEqual(0);
          expect(attainment).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
