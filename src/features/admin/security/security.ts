// =============================================================================
// Admin Security console — pure classification logic
// =============================================================================
//
// Presentation-layer helpers for the security console. Pure (no JSX / no
// Supabase) so they are fully unit- + property-testable. They classify the raw
// rows of `blocked_ips`, `login_attempts`, and `rate_limit_events` into the
// status/severity the UI renders (status dots, §B.4 of PARITY.md).
// =============================================================================

export type RateLimitSeverity = "critical" | "attention" | "monitor";
export type LockStatus = "locked" | "at-risk" | "ok";

/**
 * Failed-attempt count at or above which an account is surfaced as "at-risk"
 * (a display heuristic for the console; the authoritative lockout decision is
 * the `check-login-rate` edge function, not this UI).
 */
export const AT_RISK_ATTEMPTS = 3;

/** True while a block is still in effect (its `blocked_until` is in the future). */
export function isBlockActive(
  blockedUntil: string,
  now: number = Date.now()
): boolean {
  const until = new Date(blockedUntil).getTime();
  return Number.isFinite(until) && until > now;
}

/**
 * Classify a login-attempt row: `locked` while `locked_until` is in the future,
 * else `at-risk` once repeated failures reach the threshold, else `ok`.
 */
export function loginLockStatus(
  lockedUntil: string | null,
  attemptCount: number,
  now: number = Date.now()
): LockStatus {
  if (lockedUntil) {
    const until = new Date(lockedUntil).getTime();
    if (Number.isFinite(until) && until > now) return "locked";
  }
  return attemptCount >= AT_RISK_ATTEMPTS ? "at-risk" : "ok";
}

/**
 * Map a rate-limit `event_type` to a display severity. Keyword-based so it
 * degrades gracefully for event types the UI hasn't seen before (→ `monitor`).
 */
export function rateLimitSeverity(eventType: string): RateLimitSeverity {
  const type = eventType.toLowerCase();
  if (type.includes("block") || type.includes("lock")) return "critical";
  if (
    type.includes("limit") ||
    type.includes("throttle") ||
    type.includes("captcha")
  ) {
    return "attention";
  }
  return "monitor";
}
