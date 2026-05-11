// Feature: ai-tutor-rag, Property 25: Message count never exceeds daily limit (50)
// Feature: ai-tutor-rag, Property 26: Warning shows at 80% threshold (40+ messages)
// Feature: ai-tutor-rag, Property 27: Token budget enforcement (50,000 tokens/day)
// **Validates: Requirements 15.1, 15.2, 15.4, 15.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure rate limit logic (mirrors Edge Function behavior) ──────────────────

const DAILY_MESSAGE_LIMIT = 50;
const DAILY_TOKEN_BUDGET = 50_000;
const WARNING_THRESHOLD = 0.8; // 80%

interface UsageStatus {
  message_count: number;
  token_count: number;
  daily_message_limit: number;
  daily_token_budget: number;
  warning: boolean;
  remaining_messages: number;
  message_limit_reached: boolean;
  token_budget_exceeded: boolean;
}

const computeUsageStatus = (
  messageCount: number,
  tokenCount: number,
  dailyMessageLimit: number = DAILY_MESSAGE_LIMIT,
  dailyTokenBudget: number = DAILY_TOKEN_BUDGET
): UsageStatus => {
  const remaining = Math.max(0, dailyMessageLimit - messageCount);
  const warningThreshold = Math.floor(dailyMessageLimit * WARNING_THRESHOLD);

  return {
    message_count: messageCount,
    token_count: tokenCount,
    daily_message_limit: dailyMessageLimit,
    daily_token_budget: dailyTokenBudget,
    warning: messageCount >= warningThreshold,
    remaining_messages: remaining,
    message_limit_reached: messageCount >= dailyMessageLimit,
    token_budget_exceeded: tokenCount >= dailyTokenBudget,
  };
};

const canSendMessage = (status: UsageStatus): boolean => {
  return !status.message_limit_reached && !status.token_budget_exceeded;
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const messageCountArb = fc.integer({ min: 0, max: 200 });
const tokenCountArb = fc.integer({ min: 0, max: 100_000 });

// ─── P25: Message count never exceeds daily limit ────────────────────────────

describe("Property 25 — Daily message limit enforcement", () => {
  it("P25a: when message count >= 50, sending is blocked", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: DAILY_MESSAGE_LIMIT, max: 200 }),
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.message_limit_reached).toBe(true);
          expect(status.remaining_messages).toBe(0);

          // If token budget is also not exceeded, message limit alone blocks
          if (tokenCount < DAILY_TOKEN_BUDGET) {
            expect(canSendMessage(status)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P25b: when message count < 50, message limit is not reached", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DAILY_MESSAGE_LIMIT - 1 }),
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.message_limit_reached).toBe(false);
          expect(status.remaining_messages).toBe(
            DAILY_MESSAGE_LIMIT - messageCount
          );
          expect(status.remaining_messages).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P26: Warning shows at 80% threshold ─────────────────────────────────────

describe("Property 26 — Warning at 80% threshold", () => {
  it("P26a: warning is true when message count >= 40 (80% of 50)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 200 }),
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.warning).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P26b: warning is false when message count < 40", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 39 }),
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.warning).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P26c: warning includes correct remaining message count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: DAILY_MESSAGE_LIMIT - 1 }),
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.warning).toBe(true);
          expect(status.remaining_messages).toBe(
            DAILY_MESSAGE_LIMIT - messageCount
          );
          expect(status.remaining_messages).toBeGreaterThan(0);
          expect(status.remaining_messages).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P27: Token budget enforcement ───────────────────────────────────────────

describe("Property 27 — Token budget enforcement", () => {
  it("P27a: when token count >= 50,000, token budget is exceeded", () => {
    fc.assert(
      fc.property(
        messageCountArb,
        fc.integer({ min: DAILY_TOKEN_BUDGET, max: 100_000 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.token_budget_exceeded).toBe(true);

          // If message limit is also not reached, token budget alone blocks
          if (messageCount < DAILY_MESSAGE_LIMIT) {
            expect(canSendMessage(status)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P27b: when token count < 50,000, token budget is not exceeded", () => {
    fc.assert(
      fc.property(
        messageCountArb,
        fc.integer({ min: 0, max: DAILY_TOKEN_BUDGET - 1 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          expect(status.token_budget_exceeded).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P27c: sending is allowed only when both limits are within budget", () => {
    fc.assert(
      fc.property(
        messageCountArb,
        tokenCountArb,
        (messageCount, tokenCount) => {
          const status = computeUsageStatus(messageCount, tokenCount);
          const allowed = canSendMessage(status);

          if (
            messageCount >= DAILY_MESSAGE_LIMIT ||
            tokenCount >= DAILY_TOKEN_BUDGET
          ) {
            expect(allowed).toBe(false);
          } else {
            expect(allowed).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
