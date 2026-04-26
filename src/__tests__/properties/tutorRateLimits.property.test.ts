// Feature: ai-tutor-rag, Property 25: Message limit enforcement (50/day default)
// Feature: ai-tutor-rag, Property 26: Warning threshold at 80%
// Feature: ai-tutor-rag, Property 27: Token budget enforcement (50,000/day default)
// **Validates: Requirements 15.1, 15.2, 15.4, 15.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeUsageStatus,
  DEFAULT_DAILY_MESSAGE_LIMIT,
  DEFAULT_DAILY_TOKEN_BUDGET,
  WARNING_THRESHOLD,
} from '@/lib/tutorRateLimits';

// ─── Property 25: Daily message limit enforcement ───────────────────────────

describe('Property 25 — Daily message limit enforcement', () => {
  it('P25a: when message count ≥ limit, is_blocked is true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: DEFAULT_DAILY_MESSAGE_LIMIT, max: 200 }),
        fc.integer({ min: 0, max: DEFAULT_DAILY_TOKEN_BUDGET - 1 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.is_blocked).toBe(true);
          expect(status.remaining_messages).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P25b: when message count < limit and token count < budget, is_blocked is false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DEFAULT_DAILY_MESSAGE_LIMIT - 1 }),
        fc.integer({ min: 0, max: DEFAULT_DAILY_TOKEN_BUDGET - 1 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.is_blocked).toBe(false);
          expect(status.remaining_messages).toBe(
            DEFAULT_DAILY_MESSAGE_LIMIT - messageCount,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P25c: remaining_messages is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 0, max: 100_000 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.remaining_messages).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 26: Warning threshold at 80% ──────────────────────────────────

describe('Property 26 — Warning threshold at 80%', () => {
  it('P26a: is_warning is true when message count ≥ 80% of limit', () => {
    const warningThreshold = Math.ceil(DEFAULT_DAILY_MESSAGE_LIMIT * WARNING_THRESHOLD);

    fc.assert(
      fc.property(
        fc.integer({ min: warningThreshold, max: 200 }),
        fc.integer({ min: 0, max: 100_000 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.is_warning).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P26b: is_warning is false when message count < 80% of limit', () => {
    const belowWarning = Math.ceil(DEFAULT_DAILY_MESSAGE_LIMIT * WARNING_THRESHOLD) - 1;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: belowWarning }),
        fc.integer({ min: 0, max: 100_000 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.is_warning).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 27: Daily token budget enforcement ────────────────────────────

describe('Property 27 — Daily token budget enforcement', () => {
  it('P27a: when token count ≥ budget, is_blocked is true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DEFAULT_DAILY_MESSAGE_LIMIT - 1 }),
        fc.integer({ min: DEFAULT_DAILY_TOKEN_BUDGET, max: 200_000 }),
        (messageCount, tokenCount) => {
          const status = computeUsageStatus({ messageCount, tokenCount });
          expect(status.is_blocked).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P27b: custom limits are respected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        fc.integer({ min: 1000, max: 100_000 }),
        (customLimit, customBudget) => {
          // At the limit
          const blocked = computeUsageStatus({
            messageCount: customLimit,
            tokenCount: 0,
            dailyMessageLimit: customLimit,
            dailyTokenBudget: customBudget,
          });
          expect(blocked.is_blocked).toBe(true);

          // Below the limit
          const notBlocked = computeUsageStatus({
            messageCount: customLimit - 1,
            tokenCount: customBudget - 1,
            dailyMessageLimit: customLimit,
            dailyTokenBudget: customBudget,
          });
          expect(notBlocked.is_blocked).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
