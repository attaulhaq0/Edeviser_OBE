// =============================================================================
// Property 107: Most Improved calculation correctness
// Feature: edeviser-platform
// **Validates: Requirements 130.2, 130.3**
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateImprovement, rankMostImproved } from '@/lib/mostImprovedLeaderboard';

// ─── Generators ──────────────────────────────────────────────────────────────

const studentEntryArb = fc.record({
  student_id: fc.uuid(),
  student_name: fc.string({ minLength: 1, maxLength: 20 }),
  current_4_week_xp: fc.integer({ min: 0, max: 10000 }),
  previous_4_week_xp: fc.integer({ min: 0, max: 10000 }),
});

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property 107: Most Improved calculation correctness', () => {
  it('improvement equals (current - previous) / previous * 100 for non-zero previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (current, previous) => {
          const result = calculateImprovement(current, previous);
          expect(result).not.toBeNull();
          const expected = ((current - previous) / previous) * 100;
          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('students with zero previous XP are excluded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (current) => {
          const result = calculateImprovement(current, 0);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rankMostImproved returns at most 20 entries', () => {
    fc.assert(
      fc.property(
        fc.array(studentEntryArb, { minLength: 0, maxLength: 50 }),
        (entries) => {
          const result = rankMostImproved(entries);
          expect(result.length).toBeLessThanOrEqual(20);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rankMostImproved excludes all entries with zero previous XP', () => {
    fc.assert(
      fc.property(
        fc.array(studentEntryArb, { minLength: 1, maxLength: 30 }),
        (entries) => {
          const result = rankMostImproved(entries);
          for (const entry of result) {
            expect(entry.previous_4_week_xp).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rankMostImproved results are sorted by improvement_percent descending', () => {
    fc.assert(
      fc.property(
        fc.array(studentEntryArb, { minLength: 2, maxLength: 30 }),
        (entries) => {
          const result = rankMostImproved(entries);
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1]!.improvement_percent).toBeGreaterThanOrEqual(
              result[i]!.improvement_percent,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('xp_delta equals current_4_week_xp - previous_4_week_xp', () => {
    fc.assert(
      fc.property(
        fc.array(studentEntryArb, { minLength: 1, maxLength: 20 }),
        (entries) => {
          const result = rankMostImproved(entries);
          for (const entry of result) {
            expect(entry.xp_delta).toBe(
              entry.current_4_week_xp - entry.previous_4_week_xp,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
