// ---------------------------------------------------------------------------
// Login Attempt Tracker — client-side lockout via localStorage
// ---------------------------------------------------------------------------
// Tracks failed login attempts per email. After MAX_ATTEMPTS consecutive
// failures the account is locked for LOCKOUT_DURATION_MS.
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'login_attempts_';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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

// Re-export constants for testing
export const LOGIN_ATTEMPT_CONFIG = {
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  STORAGE_PREFIX,
} as const;
