// ─── Tutor Rate Limit Utilities ─────────────────────────────────────────────
//
// Pure functions for computing rate limit status from usage counters.
// Used by useTutorUsage hook and chat-with-tutor Edge Function.

import type { TutorUsage } from '@/lib/tutorSchemas';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_DAILY_MESSAGE_LIMIT = 50;
export const DEFAULT_DAILY_TOKEN_BUDGET = 50_000;
export const WARNING_THRESHOLD = 0.8;

// ─── Rate Limit Computation ─────────────────────────────────────────────────

export interface UsageInput {
  messageCount: number;
  tokenCount: number;
  dailyMessageLimit?: number;
  dailyTokenBudget?: number;
}

/**
 * Computes the rate limit status from raw usage counters.
 *
 * - `is_blocked`: true when message count ≥ limit OR token count ≥ budget
 * - `is_warning`: true when message count ≥ 80% of limit
 * - `remaining_messages`: max(0, limit - count)
 */
export function computeUsageStatus(input: UsageInput): TutorUsage {
  const {
    messageCount,
    tokenCount,
    dailyMessageLimit = DEFAULT_DAILY_MESSAGE_LIMIT,
    dailyTokenBudget = DEFAULT_DAILY_TOKEN_BUDGET,
  } = input;

  const remainingMessages = Math.max(0, dailyMessageLimit - messageCount);
  const isWarning = messageCount >= dailyMessageLimit * WARNING_THRESHOLD;
  const isBlocked = messageCount >= dailyMessageLimit || tokenCount >= dailyTokenBudget;

  return {
    message_count: messageCount,
    token_count: tokenCount,
    daily_message_limit: dailyMessageLimit,
    daily_token_budget: dailyTokenBudget,
    is_warning: isWarning,
    is_blocked: isBlocked,
    remaining_messages: remainingMessages,
  };
}
