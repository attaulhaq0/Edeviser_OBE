// Feature: ai-tutor-rag, Property 32: XP award threshold (3+ messages triggers 15 XP)
// Feature: ai-tutor-rag, Property 33: Rating XP cap (max 3 ratings/day × 5 XP = 15 XP/day)
// **Validates: Requirements 17.1, 17.2, 17.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { XP_SCHEDULE } from "@/lib/xpSchedule";

// ─── Pure XP logic (mirrors Edge Function behavior) ──────────────────────────

const TUTOR_ENGAGEMENT_XP = XP_SCHEDULE.tutor_engagement; // 15
const TUTOR_RATING_XP = XP_SCHEDULE.tutor_rating; // 5
const XP_MESSAGE_THRESHOLD = 3;
const MAX_RATING_XP_PER_DAY = 3;

interface ConversationXPState {
  studentMessageCount: number;
  xpAwarded: boolean;
}

interface DailyRatingState {
  ratingXpCount: number; // how many rating XP awards today
}

/**
 * Determines if tutor engagement XP should be awarded for a conversation.
 * Returns the XP amount (15 or 0).
 */
const computeEngagementXP = (state: ConversationXPState): number => {
  if (state.studentMessageCount >= XP_MESSAGE_THRESHOLD && !state.xpAwarded) {
    return TUTOR_ENGAGEMENT_XP;
  }
  return 0;
};

/**
 * Determines if rating XP should be awarded.
 * Returns the XP amount (5 or 0).
 */
const computeRatingXP = (dailyState: DailyRatingState): number => {
  if (dailyState.ratingXpCount < MAX_RATING_XP_PER_DAY) {
    return TUTOR_RATING_XP;
  }
  return 0;
};

/**
 * Computes total possible rating XP for a day given N ratings.
 */
const computeTotalDailyRatingXP = (ratingsGiven: number): number => {
  const eligible = Math.min(ratingsGiven, MAX_RATING_XP_PER_DAY);
  return eligible * TUTOR_RATING_XP;
};

// ─── P32: XP award threshold ─────────────────────────────────────────────────

describe("Property 32 — XP award threshold (3+ messages triggers 15 XP)", () => {
  it("P32a: conversations with 3+ student messages and no prior XP award get 15 XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: XP_MESSAGE_THRESHOLD, max: 100 }),
        (messageCount) => {
          const xp = computeEngagementXP({
            studentMessageCount: messageCount,
            xpAwarded: false,
          });
          expect(xp).toBe(TUTOR_ENGAGEMENT_XP);
          expect(xp).toBe(15);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P32b: conversations with fewer than 3 student messages get 0 XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: XP_MESSAGE_THRESHOLD - 1 }),
        (messageCount) => {
          const xp = computeEngagementXP({
            studentMessageCount: messageCount,
            xpAwarded: false,
          });
          expect(xp).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P32c: conversations that already awarded XP get 0 XP regardless of message count", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (messageCount) => {
        const xp = computeEngagementXP({
          studentMessageCount: messageCount,
          xpAwarded: true,
        });
        expect(xp).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("P32d: XP is awarded exactly once per conversation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: XP_MESSAGE_THRESHOLD, max: 50 }),
        (totalMessages) => {
          // Simulate message-by-message progression
          let xpAwarded = false;
          let totalXP = 0;

          for (let i = 1; i <= totalMessages; i++) {
            const xp = computeEngagementXP({
              studentMessageCount: i,
              xpAwarded,
            });
            if (xp > 0) {
              totalXP += xp;
              xpAwarded = true;
            }
          }

          // XP should be awarded exactly once
          expect(totalXP).toBe(TUTOR_ENGAGEMENT_XP);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P33: Rating XP cap ──────────────────────────────────────────────────────

describe("Property 33 — Rating XP cap (max 3 ratings/day × 5 XP)", () => {
  it("P33a: first 3 ratings each award 5 XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RATING_XP_PER_DAY - 1 }),
        (currentCount) => {
          const xp = computeRatingXP({ ratingXpCount: currentCount });
          expect(xp).toBe(TUTOR_RATING_XP);
          expect(xp).toBe(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P33b: ratings beyond the 3rd award 0 XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_RATING_XP_PER_DAY, max: 20 }),
        (currentCount) => {
          const xp = computeRatingXP({ ratingXpCount: currentCount });
          expect(xp).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P33c: total daily rating XP never exceeds 15 (3 × 5)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (ratingsGiven) => {
        const totalXP = computeTotalDailyRatingXP(ratingsGiven);
        expect(totalXP).toBeLessThanOrEqual(
          MAX_RATING_XP_PER_DAY * TUTOR_RATING_XP
        );
        expect(totalXP).toBeLessThanOrEqual(15);
      }),
      { numRuns: 100 }
    );
  });

  it("P33d: total daily rating XP equals min(ratings, 3) × 5", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (ratingsGiven) => {
        const totalXP = computeTotalDailyRatingXP(ratingsGiven);
        const expected =
          Math.min(ratingsGiven, MAX_RATING_XP_PER_DAY) * TUTOR_RATING_XP;
        expect(totalXP).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});
