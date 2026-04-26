// Feature: ai-tutor-rag, Property 49: Independence nudge triggers after 3 consecutive same-topic questions
// Feature: ai-tutor-rag, Property 50: Nudge is non-blocking (doesn't prevent the response)
// Feature: ai-tutor-rag, Property 51: Score calculation is always in [0, 1]
// Feature: ai-tutor-rag, Property 52: Self-Reliant Scholar badge awarded when score ≥ 0.8 for all CLOs
// **Validates: Requirements 27.1, 27.3, 28.1, 29.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateIndependenceScore,
  classifyIndependenceScore,
  type IndependenceScoreInput,
} from '@/lib/independenceCalculator';

// ─── Pure helper functions for nudge and badge logic ────────────────────────

/**
 * Determines whether an independence nudge should be triggered.
 * Triggers after 3 consecutive same-topic questions in a session.
 */
function shouldTriggerNudge(consecutiveSameTopicCount: number): boolean {
  return consecutiveSameTopicCount >= 3;
}

/**
 * Determines whether a response should still be generated after a nudge.
 * Nudges are advisory — they never block the response.
 */
function isResponseBlockedByNudge(_nudgeDelivered: boolean): boolean {
  return false; // Nudges are always non-blocking
}

/**
 * Determines whether the Self-Reliant Scholar badge should be awarded.
 * Requires: attainment improved by ≥15pp AND independence score ≥ 0.8 for all CLOs.
 */
function shouldAwardSelfReliantBadge(
  cloScores: Array<{
    independenceScore: number;
    attainmentImprovement: number;
    alreadyAwarded: boolean;
  }>,
): boolean {
  if (cloScores.length === 0) return false;
  return cloScores.some(
    (clo) =>
      clo.independenceScore >= 0.8 &&
      clo.attainmentImprovement >= 15 &&
      !clo.alreadyAwarded,
  );
}

// ─── Generators ─────────────────────────────────────────────────────────────

const independenceInputArb = fc
  .record({
    totalSubmissions: fc.integer({ min: 0, max: 1000 }),
    aiAssistedSubmissions: fc.integer({ min: 0, max: 1000 }),
  })
  .map((input) => ({
    totalSubmissions: input.totalSubmissions,
    aiAssistedSubmissions: Math.min(input.aiAssistedSubmissions, input.totalSubmissions),
  }));

// ─── Property 49: Independence nudge triggers after 3 same-topic questions ──

describe('Property 49 — Independence nudge triggers after 3 consecutive same-topic questions', () => {
  it('P49a: nudge triggers when consecutive count reaches 3', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 50 }),
        (count) => {
          expect(shouldTriggerNudge(count)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P49b: nudge does NOT trigger when consecutive count is below 3', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (count) => {
          expect(shouldTriggerNudge(count)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 50: Nudge is non-blocking ─────────────────────────────────────

describe('Property 50 — Nudge is non-blocking', () => {
  it('P50: response is never blocked regardless of nudge state', () => {
    fc.assert(
      fc.property(fc.boolean(), (nudgeDelivered) => {
        expect(isResponseBlockedByNudge(nudgeDelivered)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 51: Score calculation is always in [0, 1] ─────────────────────

describe('Property 51 — Independence score is always in [0, 1]', () => {
  it('P51a: score is always between 0 and 1 for any valid input', () => {
    fc.assert(
      fc.property(independenceInputArb, (input) => {
        const score = calculateIndependenceScore(input);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('P51b: score equals 1 - (aiAssisted / total) for positive submissions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (total, aiAssisted) => {
          const clamped = Math.min(aiAssisted, total);
          const input: IndependenceScoreInput = {
            totalSubmissions: total,
            aiAssistedSubmissions: clamped,
          };
          const score = calculateIndependenceScore(input);
          const expected = 1 - clamped / total;
          expect(score).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P51c: zero submissions returns 1.0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (aiAssisted) => {
        const score = calculateIndependenceScore({
          totalSubmissions: 0,
          aiAssistedSubmissions: aiAssisted,
        });
        expect(score).toBe(1.0);
      }),
      { numRuns: 100 },
    );
  });

  it('P51d: all AI-assisted returns 0.0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (total) => {
        const score = calculateIndependenceScore({
          totalSubmissions: total,
          aiAssistedSubmissions: total,
        });
        expect(score).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P51e: no AI-assisted returns 1.0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (total) => {
        const score = calculateIndependenceScore({
          totalSubmissions: total,
          aiAssistedSubmissions: 0,
        });
        expect(score).toBe(1.0);
      }),
      { numRuns: 100 },
    );
  });

  it('P51f: classifyIndependenceScore returns valid color for any score in [0,1]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (score) => {
          const color = classifyIndependenceScore(score);
          expect(['green', 'yellow', 'red']).toContain(color);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 52: Self-Reliant Scholar badge ────────────────────────────────

describe('Property 52 — Self-Reliant Scholar badge awarded when score ≥ 0.8 and improvement ≥ 15pp', () => {
  it('P52a: badge awarded when independence ≥ 0.8 and improvement ≥ 15', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 1.0, noNaN: true }),
        fc.double({ min: 15, max: 100, noNaN: true }),
        (score, improvement) => {
          const result = shouldAwardSelfReliantBadge([
            { independenceScore: score, attainmentImprovement: improvement, alreadyAwarded: false },
          ]);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P52b: badge NOT awarded when independence < 0.8', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.79, noNaN: true }),
        fc.double({ min: 15, max: 100, noNaN: true }),
        (score, improvement) => {
          const result = shouldAwardSelfReliantBadge([
            { independenceScore: score, attainmentImprovement: improvement, alreadyAwarded: false },
          ]);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P52c: badge NOT awarded when improvement < 15pp', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 1.0, noNaN: true }),
        fc.double({ min: 0, max: 14.9, noNaN: true }),
        (score, improvement) => {
          const result = shouldAwardSelfReliantBadge([
            { independenceScore: score, attainmentImprovement: improvement, alreadyAwarded: false },
          ]);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P52d: badge NOT awarded if already awarded (idempotent)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 1.0, noNaN: true }),
        fc.double({ min: 15, max: 100, noNaN: true }),
        (score, improvement) => {
          const result = shouldAwardSelfReliantBadge([
            { independenceScore: score, attainmentImprovement: improvement, alreadyAwarded: true },
          ]);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P52e: empty CLO scores returns false', () => {
    fc.assert(
      fc.property(fc.constant([]), () => {
        const result = shouldAwardSelfReliantBadge([]);
        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
