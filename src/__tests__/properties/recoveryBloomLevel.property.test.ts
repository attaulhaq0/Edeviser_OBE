// Feature: adaptive-quiz-generation, Property 23: Recovery Bloom's level floored at 1
// **Validates: Requirements 19.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { recoveryBloomLevel } from '@/lib/masteryRecovery';

/** Arbitrary for a valid CLO Bloom's level (1–6). */
const bloomLevelArb = fc.integer({ min: 1, max: 6 });

describe("Recovery Bloom's level floored at 1 — property-based tests", () => {
  it('P23a: recoveryBloomLevel returns max(1, level - 1) for any Bloom level in [1, 6]', () => {
    fc.assert(
      fc.property(bloomLevelArb, (level) => {
        const result = recoveryBloomLevel(level);
        expect(result).toBe(Math.max(1, level - 1));
      }),
      { numRuns: 100 },
    );
  });

  it('P23b: recoveryBloomLevel returns 1 (not 0) when CLO Bloom level is 1', () => {
    fc.assert(
      fc.property(fc.constant(1), (level) => {
        const result = recoveryBloomLevel(level);
        expect(result).toBe(1);
        expect(result).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('P23c: recoveryBloomLevel always returns a value >= 1', () => {
    fc.assert(
      fc.property(bloomLevelArb, (level) => {
        const result = recoveryBloomLevel(level);
        expect(result).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('P23d: recoveryBloomLevel always returns a value <= 5 for inputs in [1, 6]', () => {
    fc.assert(
      fc.property(bloomLevelArb, (level) => {
        const result = recoveryBloomLevel(level);
        expect(result).toBeLessThanOrEqual(5);
      }),
      { numRuns: 100 },
    );
  });

  it('P23e: recoveryBloomLevel returns level - 1 for levels 2 through 6', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (level) => {
        const result = recoveryBloomLevel(level);
        expect(result).toBe(level - 1);
      }),
      { numRuns: 100 },
    );
  });
});
