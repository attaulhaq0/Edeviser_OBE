// =============================================================================
// Property-Based Test: League Tier Calculator
// Task 25.4 — P29: tier assignment from percentiles, P30: percentile band display
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { assignTierFromPercentile, assignLeagueTiers } from '@/lib/leagueTierCalculator';
import { calculatePercentileBand } from '@/lib/percentileBand';

/**
 * **Validates: Requirements 132.1**
 * P29: Tier assignment from percentiles is deterministic and non-overlapping.
 */
describe('P29: League tier assignment from percentiles', () => {
  it('every percentile rank maps to exactly one tier', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (percentileRank) => {
          const tier = assignTierFromPercentile(percentileRank);
          expect(['diamond', 'gold', 'silver', 'bronze']).toContain(tier);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('diamond is assigned for top 5% (percentile ≤ 0.05)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.05, noNaN: true }),
        (percentileRank) => {
          expect(assignTierFromPercentile(percentileRank)).toBe('diamond');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bronze is assigned for bottom 50% (percentile > 0.50)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.501, max: 1, noNaN: true }),
        (percentileRank) => {
          expect(assignTierFromPercentile(percentileRank)).toBe('bronze');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every student gets exactly one tier in bulk assignment', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            studentId: fc.uuid(),
            xpTotal: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (students) => {
          const assignments = assignLeagueTiers(students);
          expect(assignments.length).toBe(students.length);
          for (const a of assignments) {
            expect(['diamond', 'gold', 'silver', 'bronze']).toContain(a.tier);
            expect(a.percentileRank).toBeGreaterThanOrEqual(0);
            expect(a.percentileRank).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 131.1**
 * P30: Percentile band display is correct.
 */
describe('P30: Percentile band display', () => {
  it('top 10 students always see exact rank', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 10, max: 1000 }),
        (rank, totalStudents) => {
          const result = calculatePercentileBand(rank, totalStudents);
          expect(result.type).toBe('exact');
          if (result.type === 'exact') {
            expect(result.rank).toBe(rank);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('students outside top 10 see a band label', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 500 }),
        fc.integer({ min: 500, max: 1000 }),
        (rank, totalStudents) => {
          const result = calculatePercentileBand(rank, totalStudents);
          expect(result.type).toBe('band');
        },
      ),
      { numRuns: 100 },
    );
  });
});
