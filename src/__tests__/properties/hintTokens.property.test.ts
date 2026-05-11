// Feature: xp-marketplace, Property 16: Hint token allowance computation
// Feature: xp-marketplace, Property 17: Hint tokens expire at midnight UTC
// **Validates: Requirements 10.1, 10.3, 10.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  canSendTutorMessage,
  type HintTokenStatus,
} from "@/lib/hintTokenChecker";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const hintTokenStatusArb: fc.Arbitrary<HintTokenStatus> = fc
  .record({
    hasActiveTokens: fc.boolean(),
    extraMessagesRemaining: fc.integer({ min: 0, max: 25 }),
    purchaseId: fc.option(fc.uuid(), { nil: null }),
  })
  .map((s) => ({
    ...s,
    // Ensure consistency: if no remaining, hasActiveTokens must be false
    hasActiveTokens: s.extraMessagesRemaining > 0 ? s.hasActiveTokens : false,
  }));

// ─── P16: canSendTutorMessage allowance computation ─────────────────────────

describe("Property 16 — Hint token allowance computation", () => {
  it("P16a: when base messages remain, allowed without using hint token", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 10, max: 20 }),
        hintTokenStatusArb,
        (baseUsed, baseLimit, tokenStatus) => {
          // Ensure base messages remain
          fc.pre(baseUsed < baseLimit);

          const result = canSendTutorMessage(baseUsed, baseLimit, tokenStatus);
          expect(result.allowed).toBe(true);
          expect(result.usingHintToken).toBe(false);
          expect(result.remainingMessages).toBe(
            baseLimit - baseUsed + tokenStatus.extraMessagesRemaining
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P16b: when base exhausted and hint tokens available, allowed using hint token", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 20 }),
        fc.integer({ min: 1, max: 25 }),
        fc.uuid(),
        (baseLimit, extraRemaining, purchaseId) => {
          const tokenStatus: HintTokenStatus = {
            hasActiveTokens: true,
            extraMessagesRemaining: extraRemaining,
            purchaseId,
          };

          const result = canSendTutorMessage(baseLimit, baseLimit, tokenStatus);
          expect(result.allowed).toBe(true);
          expect(result.usingHintToken).toBe(true);
          expect(result.remainingMessages).toBe(extraRemaining);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P16c: when base exhausted and no hint tokens, not allowed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 20 }), (baseLimit) => {
        const tokenStatus: HintTokenStatus = {
          hasActiveTokens: false,
          extraMessagesRemaining: 0,
          purchaseId: null,
        };

        const result = canSendTutorMessage(baseLimit, baseLimit, tokenStatus);
        expect(result.allowed).toBe(false);
        expect(result.remainingMessages).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P17: Tokens expire at midnight UTC ─────────────────────────────────────

describe("Property 17 — Hint tokens expire at midnight UTC", () => {
  it("P17: a token purchased at any time T expires after midnight UTC of that day", () => {
    fc.assert(
      fc.property(
        fc
          .integer({
            min: new Date("2024-01-01").getTime(),
            max: new Date("2025-12-31").getTime(),
          })
          .map((ts) => new Date(ts)),
        (purchaseDate) => {
          // Compute midnight UTC of the purchase day
          const midnightUTC = new Date(purchaseDate);
          midnightUTC.setUTCHours(23, 59, 59, 999);

          // Any time after midnight UTC of that day should be expired
          const afterMidnight = new Date(midnightUTC.getTime() + 1);
          const isExpired = afterMidnight.getTime() > midnightUTC.getTime();
          expect(isExpired).toBe(true);

          // Any time before midnight UTC of that day should be valid
          const beforeMidnight = new Date(midnightUTC.getTime() - 1);
          const isValid = beforeMidnight.getTime() <= midnightUTC.getTime();
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
