// Feature: adaptive-quiz-generation, Property 16: Per-CLO score breakdown calculation
// **Validates: Requirements 10.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computePerCLOScore } from '@/lib/questionAnalytics';

const answerArb = fc.record({
  clo_id: fc.constantFrom('clo-1', 'clo-2', 'clo-3', 'clo-4'),
  is_correct: fc.boolean(),
});

describe('computePerCLOScore — property-based tests', () => {
  it('P16a: per-CLO score equals (correct / total) × 100 for each CLO', () => {
    fc.assert(
      fc.property(
        fc.array(answerArb, { minLength: 1, maxLength: 50 }),
        (answers) => {
          const result = computePerCLOScore(answers);

          // Manually compute expected
          const totals: Record<string, number> = {};
          const corrects: Record<string, number> = {};
          for (const a of answers) {
            totals[a.clo_id] = (totals[a.clo_id] ?? 0) + 1;
            if (a.is_correct) corrects[a.clo_id] = (corrects[a.clo_id] ?? 0) + 1;
          }

          for (const cloId of Object.keys(totals)) {
            const expected = ((corrects[cloId] ?? 0) / totals[cloId]) * 100;
            expect(result[cloId]).toBeCloseTo(expected, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P16b: all scores are in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.array(answerArb, { minLength: 1, maxLength: 50 }),
        (answers) => {
          const result = computePerCLOScore(answers);
          for (const score of Object.values(result)) {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P16c: all-correct answers produce 100% for every CLO', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.constantFrom('clo-1', 'clo-2'),
            is_correct: fc.constant(true),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (answers) => {
          const result = computePerCLOScore(answers);
          for (const score of Object.values(result)) {
            expect(score).toBeCloseTo(100, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P16d: all-incorrect answers produce 0% for every CLO', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.constantFrom('clo-1', 'clo-2'),
            is_correct: fc.constant(false),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (answers) => {
          const result = computePerCLOScore(answers);
          for (const score of Object.values(result)) {
            expect(score).toBeCloseTo(0, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P16e: empty answers produce empty result', () => {
    const result = computePerCLOScore([]);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
