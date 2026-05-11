// Feature: xp-marketplace, Property 19: One active XP boost at a time
// Feature: xp-marketplace, Property 20: Streak shield increment with cap
// **Validates: Requirements 11.7, 12.1, 12.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure functions under test ──────────────────────────────────────────────

interface ActiveBoost {
  student_id: string;
  multiplier: number;
  expires_at: string;
}

function canActivateBoost(existingBoosts: ActiveBoost[], now: Date): boolean {
  return !existingBoosts.some(
    (b) => new Date(b.expires_at).getTime() > now.getTime()
  );
}

function incrementStreakFreezes(current: number): {
  newCount: number;
  rejected: boolean;
} {
  if (current >= 3) {
    return { newCount: current, rejected: true };
  }
  return { newCount: current + 1, rejected: false };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

// ─── P19: Max one active boost ──────────────────────────────────────────────

describe("Property 19 — One active XP boost at a time", () => {
  it("P19a: cannot activate boost when one is already active (not expired)", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.double({ min: 1.5, max: 3.0 }),
        (studentId, multiplier) => {
          const existing: ActiveBoost[] = [
            { student_id: studentId, multiplier, expires_at: futureDate },
          ];
          expect(canActivateBoost(existing, new Date())).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P19b: can activate boost when no active boosts exist", () => {
    fc.assert(
      fc.property(fc.uuid(), () => {
        expect(canActivateBoost([], new Date())).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("P19c: can activate boost when all existing boosts have expired", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.double({ min: 1.5, max: 3.0 }),
        (studentId, multiplier) => {
          const existing: ActiveBoost[] = [
            { student_id: studentId, multiplier, expires_at: pastDate },
          ];
          expect(canActivateBoost(existing, new Date())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P20: Streak shield cap at 3 ───────────────────────────────────────────

describe("Property 20 — Streak shield increment with cap", () => {
  it("P20a: increment succeeds when current < 3", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (current) => {
        const result = incrementStreakFreezes(current);
        expect(result.rejected).toBe(false);
        expect(result.newCount).toBe(current + 1);
      }),
      { numRuns: 100 }
    );
  });

  it("P20b: increment rejected when current >= 3", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 10 }), (current) => {
        const result = incrementStreakFreezes(current);
        expect(result.rejected).toBe(true);
        expect(result.newCount).toBe(current);
      }),
      { numRuns: 100 }
    );
  });
});
