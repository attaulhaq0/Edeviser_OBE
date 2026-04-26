// Feature: ai-tutor-rag, Property 32: XP award threshold (3+ messages)
// Feature: ai-tutor-rag, Property 33: Rating XP cap (max 3/day)
// **Validates: Requirements 17.1, 17.2, 17.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeTutorEngagementXP,
  computeRatingXP,
  TUTOR_XP_MESSAGE_THRESHOLD,
  TUTOR_ENGAGEMENT_XP,
  RATING_XP,
  MAX_RATING_XP_PER_DAY,
} from '@/lib/tutorXp';
import { getTutorDiminishingMultiplier } from '@/lib/adaptiveXP';

// ─── Property 32: XP award threshold (3+ messages) ─────────────────────────

describe('Property 32 — XP awarded after 3+ messages', () => {
  it('P32a: conversations with ≥ 3 student messages and no prior XP get 15 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: TUTOR_XP_MESSAGE_THRESHOLD, max: 100 }),
        (messageCount) => {
          const xp = computeTutorEngagementXP(messageCount, false);
          expect(xp).toBe(TUTOR_ENGAGEMENT_XP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32b: conversations with < 3 student messages get 0 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: TUTOR_XP_MESSAGE_THRESHOLD - 1 }),
        (messageCount) => {
          const xp = computeTutorEngagementXP(messageCount, false);
          expect(xp).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32c: conversations where XP was already awarded get 0 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (messageCount) => {
          const xp = computeTutorEngagementXP(messageCount, true);
          expect(xp).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P32d: tutor diminishing multiplier reduces XP after 5 conversations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (convCount) => {
          const multiplier = getTutorDiminishingMultiplier(convCount);
          expect(multiplier).toBeGreaterThanOrEqual(0);
          expect(multiplier).toBeLessThanOrEqual(1);

          if (convCount < 5) expect(multiplier).toBe(1.0);
          else if (convCount < 10) expect(multiplier).toBe(0.5);
          else if (convCount < 15) expect(multiplier).toBe(0.25);
          else expect(multiplier).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 33: Rating XP cap (max 3/day) ────────────────────────────────

describe('Property 33 — Rating XP capped at 3 per day', () => {
  it('P33a: ratings below the daily cap award 5 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RATING_XP_PER_DAY - 1 }),
        (ratingCount) => {
          const xp = computeRatingXP(ratingCount);
          expect(xp).toBe(RATING_XP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P33b: ratings at or above the daily cap award 0 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_RATING_XP_PER_DAY, max: 50 }),
        (ratingCount) => {
          const xp = computeRatingXP(ratingCount);
          expect(xp).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
