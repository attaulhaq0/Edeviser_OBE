import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateReviewDates, isReviewCycleComplete } from '@/lib/plannerUtils';

// Feature: weekly-planner-today-view, Property 23: Review date generation
describe('Property 23: Review date generation', () => {
  const dateArb = fc.integer({ min: 0, max: 3650 }).map((offset) => {
    const d = new Date('2022-01-01');
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0] as string;
  });

  it('always generates exactly 3 review dates', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const reviews = generateReviewDates(dateStr);
        expect(reviews).toHaveLength(3);
      }),
      { numRuns: 100 },
    );
  });

  it('generates intervals of exactly 1, 3, and 7 days', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const reviews = generateReviewDates(dateStr);
        expect(reviews.map((r) => r.intervalDays)).toEqual([1, 3, 7]);
      }),
      { numRuns: 100 },
    );
  });

  it('review dates are strictly after the session date', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const reviews = generateReviewDates(dateStr);
        for (const r of reviews) {
          expect(new Date(r.reviewDate).getTime()).toBeGreaterThan(new Date(dateStr).getTime());
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 24: Review deduplication
describe('Property 24: Review deduplication', () => {
  const dateArb = fc.integer({ min: 0, max: 3650 }).map((offset) => {
    const d = new Date('2022-01-01');
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0] as string;
  });

  it('generating reviews for the same date produces identical dates', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const first = generateReviewDates(dateStr);
        const second = generateReviewDates(dateStr);
        expect(first).toEqual(second);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 25: Cycle completion
describe('Property 25: Review cycle completion', () => {
  it('returns true only when all 3 intervals are completed', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('completed', 'pending', 'skipped'),
        fc.constantFrom('completed', 'pending', 'skipped'),
        fc.constantFrom('completed', 'pending', 'skipped'),
        (s1, s3, s7) => {
          const reviews = [
            { intervalDays: 1, status: s1 },
            { intervalDays: 3, status: s3 },
            { intervalDays: 7, status: s7 },
          ];
          const result = isReviewCycleComplete(reviews);
          const expected = s1 === 'completed' && s3 === 'completed' && s7 === 'completed';
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
