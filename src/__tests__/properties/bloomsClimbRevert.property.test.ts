// Feature: adaptive-quiz-generation, Property 29: Bloom's Climb revert on incorrect at new level
// **Validates: Requirements 27.2**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { handleBloomRevert } from "@/lib/bloomsClimb";

/** Arbitrary for a valid Bloom's level (1–6). */
const bloomLevelArb = fc.integer({ min: 1, max: 6 });

describe("Bloom's Climb revert on incorrect at new level — property-based tests", () => {
  it("P29a: returns previousLevel when wasCorrect = false and justAdvanced = true", () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        bloomLevelArb,
        (currentLevel, previousLevel) => {
          const result = handleBloomRevert(
            currentLevel,
            previousLevel,
            false,
            true
          );
          expect(result).toBe(previousLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29b: returns currentLevel when wasCorrect = true (regardless of justAdvanced)", () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        bloomLevelArb,
        fc.boolean(),
        (currentLevel, previousLevel, justAdvanced) => {
          const result = handleBloomRevert(
            currentLevel,
            previousLevel,
            true,
            justAdvanced
          );
          expect(result).toBe(currentLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29c: returns currentLevel when justAdvanced = false (regardless of wasCorrect)", () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        bloomLevelArb,
        fc.boolean(),
        (currentLevel, previousLevel, wasCorrect) => {
          const result = handleBloomRevert(
            currentLevel,
            previousLevel,
            wasCorrect,
            false
          );
          expect(result).toBe(currentLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29d: only the combination wasCorrect=false AND justAdvanced=true triggers revert", () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        bloomLevelArb,
        fc.boolean(),
        fc.boolean(),
        (currentLevel, previousLevel, wasCorrect, justAdvanced) => {
          const result = handleBloomRevert(
            currentLevel,
            previousLevel,
            wasCorrect,
            justAdvanced
          );
          if (!wasCorrect && justAdvanced) {
            expect(result).toBe(previousLevel);
          } else {
            expect(result).toBe(currentLevel);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29e: result is always a valid Bloom level in [1, 6] for valid inputs", () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        bloomLevelArb,
        fc.boolean(),
        fc.boolean(),
        (currentLevel, previousLevel, wasCorrect, justAdvanced) => {
          const result = handleBloomRevert(
            currentLevel,
            previousLevel,
            wasCorrect,
            justAdvanced
          );
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});
