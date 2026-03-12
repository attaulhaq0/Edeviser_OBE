// ---------------------------------------------------------------------------
// Login Attempt Tracker — client-side lockout via localStorage + server-side
// ---------------------------------------------------------------------------
// Client-side tracking provides immediate UX feedback. Server-side tracking
// via the check-login-rate Edge Function provides tamper-proof enforcement.
// ---------------------------------------------------------------------------

import { supabase } from '@/lib/supabase';

const STORAGE_PREFIX = 'login_attempts_';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Server-Side Rate Limit Types ───────────────────────────────────────────

interface ServerRateLimitCheckResult {
  locked: boolean;
  remaining_seconds: number;
}

interface ServerRecordFailureResult {
  locked: boolean;
  remaining_seconds: number;
  attempt_count: number;
}

interface ServerClearResult {
  cleared: boolean;
}

interface AttemptRecord {
  count: number;
  lockedUntil: string | null; // ISO timestamp or null
}

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${email.toLowerCase().trim()}`;
}

function readRecord(email: string): AttemptRecord {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return { count: 0, lockedUntil: null };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'count' in parsed &&
      typeof (parsed as AttemptRecord).count === 'number'
    ) {
      return parsed as AttemptRecord;
    }
    return { count: 0, lockedUntil: null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function writeRecord(email: string, record: AttemptRecord): void {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(record));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Returns `true` when the account is currently locked out.
 */
export function isLocked(email: string): boolean {
  const record = readRecord(email);
  if (!record.lockedUntil) return false;
  const lockedUntil = new Date(record.lockedUntil).getTime();
  if (Date.now() >= lockedUntil) {
    // Lock expired — clear it
    clearAttempts(email);
    return false;
  }
  return true;
}

/**
 * Remaining lock time in whole seconds (0 when not locked).
 */
export function getRemainingLockTime(email: string): number {
  const record = readRecord(email);
  if (!record.lockedUntil) return 0;
  const remaining = new Date(record.lockedUntil).getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Record a failed login attempt. Locks the account when the threshold is hit.
 */
export function recordFailedAttempt(email: string): void {
  const record = readRecord(email);
  const newCount = record.count + 1;

  const lockedUntil =
    newCount >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
      : record.lockedUntil;

  writeRecord(email, { count: newCount, lockedUntil });
}

/**
 * Clear all attempt data for an email (call on successful login).
 */
export function clearAttempts(email: string): void {
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // Fail silently
  }
}

// ---------------------------------------------------------------------------
// Server-Side Rate Limiting — calls check-login-rate Edge Function
// ---------------------------------------------------------------------------

async function callRateLimitEdgeFunction(
  email: string,
  action: 'check' | 'record_failure' | 'clear',
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('check-login-rate', {
    body: { email: email.toLowerCase().trim(), action },
  });

  if (error) {
    console.error(`Server rate limit ${action} failed:`, error.message);
    return null;
  }

  return data;
}

/**
 * Check server-side rate limit status for an email.
 * Returns lock status and remaining seconds. Falls back gracefully
 * if the edge function is unavailable (returns unlocked).
 */
export async function checkServerRateLimit(
  email: string,
): Promise<ServerRateLimitCheckResult> {
  const result = await callRateLimitEdgeFunction(email, 'check');

  if (
    result &&
    typeof result === 'object' &&
    'locked' in result &&
    typeof (result as ServerRateLimitCheckResult).locked === 'boolean'
  ) {
    return result as ServerRateLimitCheckResult;
  }

  // Fallback: if server is unreachable, don't block login
  return { locked: false, remaining_seconds: 0 };
}

/**
 * Record a failed login attempt on the server.
 * Returns updated lock status. Falls back gracefully.
 */
export async function recordServerFailedAttempt(
  email: string,
): Promise<ServerRecordFailureResult> {
  const result = await callRateLimitEdgeFunction(email, 'record_failure');

  if (
    result &&
    typeof result === 'object' &&
    'locked' in result &&
    typeof (result as ServerRecordFailureResult).locked === 'boolean'
  ) {
    return result as ServerRecordFailureResult;
  }

  return { locked: false, remaining_seconds: 0, attempt_count: 0 };
}

/**
 * Clear server-side login attempts for an email (call on successful login).
 * Falls back gracefully if the edge function is unavailable.
 */
export async function clearServerAttempts(email: string): Promise<ServerClearResult> {
  const result = await callRateLimitEdgeFunction(email, 'clear');

  if (
    result &&
    typeof result === 'object' &&
    'cleared' in result &&
    typeof (result as ServerClearResult).cleared === 'boolean'
  ) {
    return result as ServerClearResult;
  }

  return { cleared: false };
}

// Re-export constants for testing
export const LOGIN_ATTEMPT_CONFIG = {
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  STORAGE_PREFIX,
} as const;
