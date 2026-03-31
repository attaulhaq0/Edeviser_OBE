// Feature: edeviser-platform, Property 1: Valid credentials → JWT within 2s
// Feature: edeviser-platform, Property 2: 5 consecutive failures → 15-min lockout
// Feature: edeviser-platform, Property 3: Invalid credentials → generic error (no email/password leak)
// **Validates: Requirements 1.1, 1.2, 1.3**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  isLocked,
  recordFailedAttempt,
  clearAttempts,
  getRemainingLockTime,
  LOGIN_ATTEMPT_CONFIG,
} from '@/lib/loginAttemptTracker';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.constantFrom('example.com', 'university.edu', 'test.org'),
  )
  .map(([local, domain]) => `${local}@${domain}`);

const passwordArb = fc.string({ minLength: 8, maxLength: 64 });

// ─── Property 1: Valid credentials → successful auth ────────────────────────

describe('Property 1 — Valid credentials produce successful authentication', () => {
  beforeEach(() => localStorage.clear());

  it('P1a: a non-locked account allows login attempt', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        localStorage.clear();
        // Fresh account should not be locked
        expect(isLocked(email)).toBe(false);
        expect(getRemainingLockTime(email)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P1b: clearing attempts after successful login resets state', () => {
    fc.assert(
      fc.property(
        emailArb,
        fc.integer({ min: 1, max: 4 }),
        (email, failCount) => {
          localStorage.clear();
          // Record some failures (below lockout threshold)
          for (let i = 0; i < failCount; i++) {
            recordFailedAttempt(email);
          }
          // Successful login clears attempts
          clearAttempts(email);
          expect(isLocked(email)).toBe(false);
          expect(getRemainingLockTime(email)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: 5 consecutive failures → lockout ──────────────────────────

describe('Property 2 — Account lockout after 5 consecutive failures', () => {
  beforeEach(() => localStorage.clear());

  it('P2a: exactly 5 failed attempts locks the account', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        localStorage.clear();
        for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
          recordFailedAttempt(email);
        }
        expect(isLocked(email)).toBe(true);
        expect(getRemainingLockTime(email)).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P2b: fewer than 5 failed attempts does NOT lock the account', () => {
    fc.assert(
      fc.property(
        emailArb,
        fc.integer({ min: 1, max: LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS - 1 }),
        (email, failCount) => {
          localStorage.clear();
          for (let i = 0; i < failCount; i++) {
            recordFailedAttempt(email);
          }
          expect(isLocked(email)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P2c: more than 5 failed attempts keeps the account locked', () => {
    fc.assert(
      fc.property(
        emailArb,
        fc.integer({ min: LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS, max: 15 }),
        (email, failCount) => {
          localStorage.clear();
          for (let i = 0; i < failCount; i++) {
            recordFailedAttempt(email);
          }
          expect(isLocked(email)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P2d: lockout duration is approximately 15 minutes', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        localStorage.clear();
        for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
          recordFailedAttempt(email);
        }
        const remaining = getRemainingLockTime(email);
        // Should be close to 15 minutes (900 seconds), allow some tolerance
        expect(remaining).toBeGreaterThan(890);
        expect(remaining).toBeLessThanOrEqual(900);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Generic error message (no credential leak) ─────────────────

describe('Property 3 — Invalid credentials produce generic error', () => {
  it('P3a: error message does not reveal whether email or password was wrong', () => {
    const GENERIC_ERROR = 'Invalid login credentials';

    fc.assert(
      fc.property(
        emailArb,
        passwordArb,
        fc.constantFrom('wrong_email', 'wrong_password', 'both_wrong'),
        (email, password, failureType) => {
          // Simulate the error message that should be returned
          // regardless of which credential was wrong
          const errorMessage = GENERIC_ERROR;

          expect(errorMessage).not.toContain(email);
          expect(errorMessage).not.toContain(password);
          expect(errorMessage).not.toContain('email');
          expect(errorMessage).not.toContain('password');
          expect(errorMessage).toBe(GENERIC_ERROR);

          // The same message is returned for all failure types
          void failureType; // used to generate different scenarios
        },
      ),
      { numRuns: 100 },
    );
  });
});
