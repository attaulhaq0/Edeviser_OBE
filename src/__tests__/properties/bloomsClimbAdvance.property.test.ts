// Feature: adaptive-quiz-generation, Property 28: Bloom's Climb advancement after 3 consecutive correct
// **Validates: Requirements 27.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldAdvanceBloom } from '@/lib/bloomsClimb';

/** Arbitrary for a valid Bloom's level (1–6). */
const bloomLevelArb = fc.integer({ min: 1, max: 6 });

/** Arbitrary for consecutive correct count (0+). */
const consecutiveCorrectArb = fc.integer({ min: 0, max: 200 });

describe("Bloom's Climb advancement after 3 consecutive correct — property-based tests", () => {
  it('P28a: advances to currentLevel + 1 when consecutiveCorrect >= 3 and currentLevel < 6', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 3, max: 200 }),
        (currentLevel, consecutiveCorrect) => {
          const result = shouldAdvanceBloom(currentLevel, consecutiveCorrect);
          expect(result).toBe(currentLevel + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P28b: returns 6 (capped at Creating) when currentLevel = 6 regardless of consecutive correct', () => {
    fc.assert(
      fc.property(consecutiveCorrectArb, (consecutiveCorrect) => {
        const result = shouldAdvanceBloom(6, consecutiveCorrect);
        expect(result).toBe(6);
      }),
      { numRuns: 100 },
    );
  });

  it('P28c: returns currentLevel when consecutiveCorrect < 3', () => {
    fc.assert(
      fc.property(
        bloomLevelArb,
        fc.integer({ min: 0, max: 2 }),
        (currentLevel, consecutiveCorrect) => {
          const result = shouldAdvanceBloom(currentLevel, consecutiveCorrect);
          expect(result).toBe(currentLevel);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P28d: result is always between 1 and 6 inclusive for valid inputs', () => {
    fc.assert(
      fc.property(bloomLevelArb, consecutiveCorrectArb, (currentLevel, consecutiveCorrect) => {
        const result = shouldAdvanceBloom(currentLevel, consecutiveCorrect);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }),
      { numRuns: 100 },
    );
  });

  it('P28e: result is never less than currentLevel (advancement never decreases level)', () => {
    fc.assert(
      fc.property(bloomLevelArb, consecutiveCorrectArb, (currentLevel, consecutiveCorrect) => {
        const result = shouldAdvanceBloom(currentLevel, consecutiveCorrect);
        expect(result).toBeGreaterThanOrEqual(currentLevel);
      }),
      { numRuns: 100 },
    );
  });
});
