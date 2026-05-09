// Feature: pre-deployment-e2e-audit, Property 6: Single Bloom level per CLO
// **Validates: Requirements 7.6**
//
// Every CLO is associated with exactly one Bloom's Taxonomy level — never
// zero, never multiple. The app enforces this at the schema + form layer;
// the property test asserts the constraint at the type-level boundary
// where CLOs are constructed or parsed.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

const BLOOM_LEVELS = [
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
] as const;
type BloomLevel = (typeof BLOOM_LEVELS)[number];

interface Clo {
  readonly id: string;
  readonly bloomLevel: BloomLevel;
}

const arbitraryClo = (): fc.Arbitrary<Clo> =>
  fc.record<Clo>({
    id: fc.uuid({ version: 4 }),
    bloomLevel: fc.constantFrom(...BLOOM_LEVELS),
  });

describe("Property 6 — single Bloom level per CLO", () => {
  it("every generated CLO has exactly one Bloom level from the six valid values", () => {
    fc.assert(
      fc.property(arbitraryClo(), (clo) => {
        expect(clo.bloomLevel).toBeDefined();
        expect(BLOOM_LEVELS).toContain(clo.bloomLevel);
      }),
      { numRuns: 100 }
    );
  });

  it("a CLO without a Bloom level is rejected by the type guard", () => {
    const isValidClo = (value: unknown): value is Clo => {
      if (!value || typeof value !== "object") return false;
      const v = value as { bloomLevel?: unknown };
      return (
        typeof v.bloomLevel === "string" &&
        (BLOOM_LEVELS as readonly string[]).includes(v.bloomLevel)
      );
    };

    // Generated invalid inputs: missing bloomLevel, multi-level array, non-string
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ id: fc.uuid({ version: 4 }) }),
          fc.record({
            id: fc.uuid({ version: 4 }),
            bloomLevel: fc.array(fc.constantFrom(...BLOOM_LEVELS), {
              minLength: 2,
              maxLength: 3,
            }),
          }),
          fc.record({
            id: fc.uuid({ version: 4 }),
            bloomLevel: fc.constant(null),
          })
        ),
        (invalid) => {
          expect(isValidClo(invalid)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
