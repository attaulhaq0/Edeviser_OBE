// Property 92: Semester attainment snapshot completeness
// Property 93: Declining trend detection
// Feature: edeviser-platform, Properties 92-93

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectDecliningTrend, type SemesterTrendPoint } from '@/lib/trendDetection';

const trendPointArb = fc.record({
  semester_id: fc.uuid(),
  semester_name: fc.string({ minLength: 1, maxLength: 20 }),
  avg_attainment: fc.double({ min: 0, max: 100, noNaN: true }),
  student_count: fc.integer({ min: 1, max: 500 }),
  evidence_count: fc.integer({ min: 0, max: 1000 }),
});

describe('Semester Trend Properties', () => {
  // Property 92: Single-point trends are never declining
  it('single semester point is never declining', () => {
    fc.assert(
      fc.property(trendPointArb, (point) => {
        const result = detectDecliningTrend([point]);
        expect(result.isDeclining).toBe(false);
        expect(result.declineAmount).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  // Property 93: ≥10pp drop between consecutive semesters triggers declining flag
  it('detects ≥10pp drop as declining', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 100, noNaN: true }),
        fc.double({ min: 10, max: 50, noNaN: true }),
        (highScore, dropAmount) => {
          const lowScore = highScore - dropAmount;
          if (lowScore < 0) return; // skip invalid

          const points: SemesterTrendPoint[] = [
            { semester_id: '1', semester_name: 'S1', avg_attainment: highScore, student_count: 50, evidence_count: 100 },
            { semester_id: '2', semester_name: 'S2', avg_attainment: lowScore, student_count: 50, evidence_count: 100 },
          ];

          const result = detectDecliningTrend(points);
          if (dropAmount >= 10) {
            expect(result.isDeclining).toBe(true);
            expect(result.declineAmount).toBeGreaterThanOrEqual(10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
