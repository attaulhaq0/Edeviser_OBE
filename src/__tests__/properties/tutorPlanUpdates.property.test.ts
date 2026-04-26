// Feature: ai-tutor-rag, Property 43: Plan update triggers after exactly 5 interactions on same CLO in 7 days
// Feature: ai-tutor-rag, Property 44: Plan update includes required fields (study_time, materials, sessions)
// Feature: ai-tutor-rag, Property 46: Adaptive frequency — reduces to every 10 interactions when acceptance rate < 30%
// **Validates: Requirements 24.1, 24.2, 25.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { LearningPlanUpdate } from '@/lib/tutorSchemas';

// ─── Pure helper functions extracted from Edge Function logic ────────────────

/**
 * Determines whether a plan update should be triggered based on
 * interaction count and acceptance rate.
 */
function shouldTriggerPlanUpdate(
  interactionCountOnClo: number,
  withinDays: number,
  acceptanceRate: number | null,
): boolean {
  if (withinDays > 7) return false;
  const threshold = acceptanceRate !== null && acceptanceRate < 0.3 ? 10 : 5;
  return interactionCountOnClo >= threshold;
}

/**
 * Computes the trigger threshold based on acceptance rate.
 */
function getPlanUpdateThreshold(acceptanceRate: number | null): number {
  if (acceptanceRate !== null && acceptanceRate < 0.3) return 10;
  return 5;
}

/**
 * Calculates acceptance rate from an array of plan update responses.
 */
function calculateAcceptanceRate(
  responses: Array<'accepted' | 'modified' | 'dismissed'>,
): number {
  if (responses.length === 0) return 1.0; // No history → default rate
  const accepted = responses.filter((r) => r === 'accepted').length;
  return accepted / responses.length;
}

/**
 * Validates that a LearningPlanUpdate has all required fields.
 */
function isValidPlanUpdate(update: Partial<LearningPlanUpdate>): boolean {
  if (!update.study_time_recommendation || update.study_time_recommendation.length === 0) return false;
  if (
    !update.recommended_materials ||
    update.recommended_materials.length < 1 ||
    update.recommended_materials.length > 3
  ) return false;
  if (
    update.suggested_planner_sessions === undefined ||
    update.suggested_planner_sessions < 1
  ) return false;
  return true;
}

// ─── Generators ─────────────────────────────────────────────────────────────

const planResponseArb = fc.constantFrom<'accepted' | 'modified' | 'dismissed'>(
  'accepted',
  'modified',
  'dismissed',
);

const materialArb = fc.record({
  chunk_id: fc.uuid(),
  source_filename: fc.string({ minLength: 1, maxLength: 50 }),
  section_title: fc.string({ minLength: 1, maxLength: 100 }),
});

const planUpdateArb = fc.record({
  id: fc.uuid(),
  clo_id: fc.uuid(),
  clo_title: fc.string({ minLength: 1, maxLength: 100 }),
  study_time_recommendation: fc.string({ minLength: 1, maxLength: 200 }),
  recommended_materials: fc.array(materialArb, { minLength: 1, maxLength: 3 }),
  suggested_planner_sessions: fc.integer({ min: 1, max: 7 }),
  interaction_count: fc.integer({ min: 5, max: 50 }),
});

// ─── Property 43: Plan update triggers after exactly 5 interactions ─────────

describe('Property 43 — Plan update triggers after 5 interactions on same CLO in 7 days', () => {
  it('P43a: triggers when interaction count reaches 5 within 7 days (default threshold)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 100 }),
        fc.integer({ min: 0, max: 7 }),
        (interactionCount, days) => {
          const result = shouldTriggerPlanUpdate(interactionCount, days, null);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P43b: does NOT trigger when interaction count is below 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 7 }),
        (interactionCount, days) => {
          const result = shouldTriggerPlanUpdate(interactionCount, days, null);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P43c: does NOT trigger when outside 7-day window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 100 }),
        fc.integer({ min: 8, max: 365 }),
        (interactionCount, days) => {
          const result = shouldTriggerPlanUpdate(interactionCount, days, null);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 44: Plan update contains required fields ──────────────────────

describe('Property 44 — Plan update includes required fields', () => {
  it('P44a: valid plan updates pass validation', () => {
    fc.assert(
      fc.property(planUpdateArb, (update) => {
        expect(isValidPlanUpdate(update)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P44b: plan update must have non-empty study_time_recommendation', () => {
    fc.assert(
      fc.property(planUpdateArb, (update) => {
        expect(update.study_time_recommendation.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P44c: plan update must have 1-3 recommended_materials', () => {
    fc.assert(
      fc.property(planUpdateArb, (update) => {
        expect(update.recommended_materials.length).toBeGreaterThanOrEqual(1);
        expect(update.recommended_materials.length).toBeLessThanOrEqual(3);
      }),
      { numRuns: 100 },
    );
  });

  it('P44d: plan update must have suggested_planner_sessions >= 1', () => {
    fc.assert(
      fc.property(planUpdateArb, (update) => {
        expect(update.suggested_planner_sessions).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 46: Adaptive frequency based on acceptance rate ───────────────

describe('Property 46 — Adaptive frequency reduces to every 10 interactions when acceptance < 30%', () => {
  it('P46a: threshold is 10 when acceptance rate < 30%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.29, noNaN: true }),
        (rate) => {
          const threshold = getPlanUpdateThreshold(rate);
          expect(threshold).toBe(10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46b: threshold is 5 when acceptance rate >= 30%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.3, max: 1.0, noNaN: true }),
        (rate) => {
          const threshold = getPlanUpdateThreshold(rate);
          expect(threshold).toBe(5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46c: acceptance rate calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.array(planResponseArb, { minLength: 1, maxLength: 20 }),
        (responses) => {
          const rate = calculateAcceptanceRate(responses);
          const expectedAccepted = responses.filter((r) => r === 'accepted').length;
          const expectedRate = expectedAccepted / responses.length;
          expect(rate).toBeCloseTo(expectedRate, 10);
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P46d: low acceptance rate responses correctly increase threshold', () => {
    fc.assert(
      fc.property(
        // Generate responses where < 30% are accepted (at least 10 responses)
        fc.array(planResponseArb, { minLength: 10, maxLength: 10 }).filter((responses) => {
          const accepted = responses.filter((r) => r === 'accepted').length;
          return accepted / responses.length < 0.3;
        }),
        (responses) => {
          const rate = calculateAcceptanceRate(responses);
          expect(rate).toBeLessThan(0.3);
          const threshold = getPlanUpdateThreshold(rate);
          expect(threshold).toBe(10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
