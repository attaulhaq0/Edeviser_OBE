import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isLocked,
  getRemainingLockTime,
  recordFailedAttempt,
  clearAttempts,
  LOGIN_ATTEMPT_CONFIG,
} from '../loginAttemptTracker';

const TEST_EMAIL = 'user@test.edu';

describe('loginAttemptTracker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isLocked', () => {
    it('returns false for an email with no recorded attempts', () => {
      expect(isLocked(TEST_EMAIL)).toBe(false);
    });

    it('returns false when fewer than MAX_ATTEMPTS failures recorded', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS - 1; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }
      expect(isLocked(TEST_EMAIL)).toBe(false);
    });

    it('returns true after MAX_ATTEMPTS consecutive failures', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }
      expect(isLocked(TEST_EMAIL)).toBe(true);
    });

    it('returns false after lockout duration expires', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }
      expect(isLocked(TEST_EMAIL)).toBe(true);

      // Advance past lockout duration
      vi.advanceTimersByTime(LOGIN_ATTEMPT_CONFIG.LOCKOUT_DURATION_MS + 1);
      expect(isLocked(TEST_EMAIL)).toBe(false);
    });

    it('is case-insensitive for email', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt('User@Test.EDU');
      }
      expect(isLocked('user@test.edu')).toBe(true);
    });
  });

  describe('getRemainingLockTime', () => {
    it('returns 0 when not locked', () => {
      expect(getRemainingLockTime(TEST_EMAIL)).toBe(0);
    });

    it('returns remaining seconds when locked', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }
      const remaining = getRemainingLockTime(TEST_EMAIL);
      // Should be close to 15 minutes (900 seconds)
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(900);
    });

    it('returns 0 after lockout expires', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }
      vi.advanceTimersByTime(LOGIN_ATTEMPT_CONFIG.LOCKOUT_DURATION_MS + 1);
      expect(getRemainingLockTime(TEST_EMAIL)).toBe(0);
    });
  });

  describe('recordFailedAttempt', () => {
    it('increments the attempt count', () => {
      recordFailedAttempt(TEST_EMAIL);
      recordFailedAttempt(TEST_EMAIL);

      const raw = localStorage.getItem('login_attempts_user@test.edu');
      const record = JSON.parse(raw!);
      expect(record.count).toBe(2);
      expect(record.lockedUntil).toBeNull();
    });

    it('sets lockedUntil on the 5th failure', () => {
      for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
        recordFailedAttempt(TEST_EMAIL);
      }

      const raw = localStorage.getItem('login_attempts_user@test.edu');
      const record = JSON.parse(raw!);
      expect(record.count).toBe(5);
      expect(record.lockedUntil).not.toBeNull();
    });
  });

  describe('clearAttempts', () => {
    it('removes the record from localStorage', () => {
      recordFailedAttempt(TEST_EMAIL);
      recordFailedAttempt(TEST_EMAIL);
      clearAttempts(TEST_EMAIL);

      expect(localStorage.getItem('login_attempts_user@test.edu')).toBeNull();
      expect(isLocked(TEST_EMAIL)).toBe(false);
    });
  });

  describe('corrupted localStorage', () => {
    it('handles invalid JSON gracefully', () => {
      localStorage.setItem('login_attempts_user@test.edu', 'not-json');
      expect(isLocked(TEST_EMAIL)).toBe(false);
      expect(getRemainingLockTime(TEST_EMAIL)).toBe(0);
    });

    it('handles missing count field gracefully', () => {
      localStorage.setItem('login_attempts_user@test.edu', '{"lockedUntil":null}');
      expect(isLocked(TEST_EMAIL)).toBe(false);
    });
  });
});
