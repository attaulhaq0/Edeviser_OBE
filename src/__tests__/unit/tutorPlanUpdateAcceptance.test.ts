import { describe, it, expect } from 'vitest';
import { planUpdateResponseSchema } from '@/lib/tutorSchemas';

// ─── Pure helper functions for plan update acceptance logic ─────────────────

type PlanUpdateResponse = 'accepted' | 'modified' | 'dismissed';

/**
 * Calculates the acceptance rate from an array of plan update responses.
 * Only 'accepted' counts as accepted. 'modified' and 'dismissed' do not.
 */
function calculateAcceptanceRate(responses: PlanUpdateResponse[]): number {
  if (responses.length === 0) return 1.0; // No history → default high rate
  const accepted = responses.filter((r) => r === 'accepted').length;
  return accepted / responses.length;
}

/**
 * Determines the trigger threshold based on acceptance rate.
 * < 30% acceptance → every 10 interactions; otherwise every 5.
 */
function getPlanUpdateThreshold(acceptanceRate: number): number {
  return acceptanceRate < 0.3 ? 10 : 5;
}

/**
 * Determines whether a plan update should be triggered.
 */
function shouldTriggerPlanUpdate(
  interactionCount: number,
  acceptanceRate: number,
): boolean {
  const threshold = getPlanUpdateThreshold(acceptanceRate);
  return interactionCount >= threshold;
}

describe('tutorPlanUpdateAcceptance', () => {
  // ─── Acceptance rate calculation ──────────────────────────────────────

  describe('acceptance rate calculation', () => {
    it('returns 1.0 for empty responses (no history)', () => {
      expect(calculateAcceptanceRate([])).toBe(1.0);
    });

    it('returns 1.0 when all responses are accepted', () => {
      expect(
        calculateAcceptanceRate(['accepted', 'accepted', 'accepted']),
      ).toBe(1.0);
    });

    it('returns 0.0 when all responses are dismissed', () => {
      expect(
        calculateAcceptanceRate(['dismissed', 'dismissed', 'dismissed']),
      ).toBe(0.0);
    });

    it('returns 0.0 when all responses are modified', () => {
      expect(
        calculateAcceptanceRate(['modified', 'modified', 'modified']),
      ).toBe(0.0);
    });

    it('returns correct rate for mixed responses', () => {
      // 2 accepted out of 5 = 0.4
      expect(
        calculateAcceptanceRate([
          'accepted',
          'dismissed',
          'accepted',
          'modified',
          'dismissed',
        ]),
      ).toBeCloseTo(0.4);
    });

    it('returns correct rate for 1 accepted out of 10', () => {
      const responses: PlanUpdateResponse[] = [
        'accepted',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
      ];
      expect(calculateAcceptanceRate(responses)).toBeCloseTo(0.1);
    });

    it('returns 0.5 for half accepted', () => {
      expect(
        calculateAcceptanceRate(['accepted', 'dismissed']),
      ).toBe(0.5);
    });
  });

  // ─── Frequency adaptation ─────────────────────────────────────────────

  describe('frequency adaptation (< 30% acceptance → every 10 interactions)', () => {
    it('threshold is 10 when acceptance rate is 0%', () => {
      expect(getPlanUpdateThreshold(0.0)).toBe(10);
    });

    it('threshold is 10 when acceptance rate is 20%', () => {
      expect(getPlanUpdateThreshold(0.2)).toBe(10);
    });

    it('threshold is 10 when acceptance rate is 29%', () => {
      expect(getPlanUpdateThreshold(0.29)).toBe(10);
    });

    it('threshold is 5 when acceptance rate is 30%', () => {
      expect(getPlanUpdateThreshold(0.3)).toBe(5);
    });

    it('threshold is 5 when acceptance rate is 50%', () => {
      expect(getPlanUpdateThreshold(0.5)).toBe(5);
    });

    it('threshold is 5 when acceptance rate is 100%', () => {
      expect(getPlanUpdateThreshold(1.0)).toBe(5);
    });
  });

  // ─── Edge cases: zero suggestions, all dismissed ──────────────────────

  describe('edge cases', () => {
    it('zero suggestions defaults to high acceptance rate (threshold 5)', () => {
      const rate = calculateAcceptanceRate([]);
      expect(rate).toBe(1.0);
      expect(getPlanUpdateThreshold(rate)).toBe(5);
    });

    it('all dismissed results in 0% acceptance (threshold 10)', () => {
      const responses: PlanUpdateResponse[] = Array(10).fill('dismissed');
      const rate = calculateAcceptanceRate(responses);
      expect(rate).toBe(0.0);
      expect(getPlanUpdateThreshold(rate)).toBe(10);
    });

    it('all modified results in 0% acceptance (threshold 10)', () => {
      const responses: PlanUpdateResponse[] = Array(10).fill('modified');
      const rate = calculateAcceptanceRate(responses);
      expect(rate).toBe(0.0);
      expect(getPlanUpdateThreshold(rate)).toBe(10);
    });

    it('single accepted out of 10 = 10% acceptance (threshold 10)', () => {
      const responses: PlanUpdateResponse[] = [
        'accepted',
        ...Array(9).fill('dismissed') as PlanUpdateResponse[],
      ];
      const rate = calculateAcceptanceRate(responses);
      expect(rate).toBeCloseTo(0.1);
      expect(getPlanUpdateThreshold(rate)).toBe(10);
    });

    it('3 accepted out of 10 = 30% acceptance (threshold 5)', () => {
      const responses: PlanUpdateResponse[] = [
        'accepted',
        'accepted',
        'accepted',
        ...Array(7).fill('dismissed') as PlanUpdateResponse[],
      ];
      const rate = calculateAcceptanceRate(responses);
      expect(rate).toBeCloseTo(0.3);
      expect(getPlanUpdateThreshold(rate)).toBe(5);
    });
  });

  // ─── Trigger logic ────────────────────────────────────────────────────

  describe('trigger logic', () => {
    it('triggers at 5 interactions with high acceptance rate', () => {
      expect(shouldTriggerPlanUpdate(5, 0.8)).toBe(true);
    });

    it('does NOT trigger at 4 interactions with high acceptance rate', () => {
      expect(shouldTriggerPlanUpdate(4, 0.8)).toBe(false);
    });

    it('triggers at 10 interactions with low acceptance rate', () => {
      expect(shouldTriggerPlanUpdate(10, 0.1)).toBe(true);
    });

    it('does NOT trigger at 9 interactions with low acceptance rate', () => {
      expect(shouldTriggerPlanUpdate(9, 0.1)).toBe(false);
    });

    it('does NOT trigger at 5 interactions with low acceptance rate', () => {
      expect(shouldTriggerPlanUpdate(5, 0.1)).toBe(false);
    });
  });

  // ─── Schema validation ────────────────────────────────────────────────

  describe('planUpdateResponseSchema', () => {
    it('accepts valid accepted response', () => {
      const result = planUpdateResponseSchema.safeParse({
        plan_update_id: '550e8400-e29b-41d4-a716-446655440000',
        response: 'accepted',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid modified response with modifications', () => {
      const result = planUpdateResponseSchema.safeParse({
        plan_update_id: '550e8400-e29b-41d4-a716-446655440000',
        response: 'modified',
        modifications: 'Changed study time to 2 hours',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid dismissed response', () => {
      const result = planUpdateResponseSchema.safeParse({
        plan_update_id: '550e8400-e29b-41d4-a716-446655440000',
        response: 'dismissed',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid response type', () => {
      const result = planUpdateResponseSchema.safeParse({
        plan_update_id: '550e8400-e29b-41d4-a716-446655440000',
        response: 'rejected',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing plan_update_id', () => {
      const result = planUpdateResponseSchema.safeParse({
        response: 'accepted',
      });
      expect(result.success).toBe(false);
    });
  });
});
