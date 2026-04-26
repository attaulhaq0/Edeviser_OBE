// ─── Retry & Exponential Backoff Utilities ──────────────────────────────────
//
// Pure functions for computing retry delays with exponential backoff.
// Used by the chat-with-tutor Edge Function for LLM API retries.

// ─── Constants ──────────────────────────────────────────────────────────────

/** Initial delay in milliseconds before the first retry. */
export const INITIAL_DELAY_MS = 1000;

/** Maximum number of retry attempts. */
export const MAX_RETRIES = 3;

// ─── Backoff Calculation ────────────────────────────────────────────────────

/**
 * Calculates the exponential backoff delay for a given retry attempt.
 *
 * Formula: `INITIAL_DELAY_MS * 2^(attempt - 1)`
 * - Attempt 1: 1000ms (1s)
 * - Attempt 2: 2000ms (2s)
 * - Attempt 3: 4000ms (4s)
 *
 * @param attempt - The retry attempt number (1-based, 1 to MAX_RETRIES).
 * @returns Delay in milliseconds, or -1 if attempt exceeds MAX_RETRIES.
 */
export function calculateBackoffDelay(attempt: number): number {
  if (attempt < 1 || attempt > MAX_RETRIES) return -1;
  return INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
}

/**
 * Returns the full sequence of retry delays for all attempts.
 *
 * @returns Array of delays in milliseconds: [1000, 2000, 4000]
 */
export function getRetryDelaySequence(): number[] {
  return Array.from({ length: MAX_RETRIES }, (_, i) =>
    calculateBackoffDelay(i + 1),
  );
}
