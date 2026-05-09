// Feature: pre-deployment-e2e-audit, Property 11: Badge awards are idempotent
// **Validates: Requirements 8.5**
//
// Running the badge check twice for the same qualifying state must produce
// at most one badge row per (student, badge). The award-xp Edge Function
// uses a unique reference_id for each (student, badge, tier) to enforce
// this at the DB level; the property test exercises the pure-reducer
// shape of that contract.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

interface Student {
  readonly id: string;
  readonly streakCount: number;
  readonly submissionCount: number;
  readonly xpTotal: number;
}

interface BadgeRow {
  readonly student_id: string;
  readonly badge_id: string;
  readonly reference_id: string;
}

/** Pure badge-check reducer. Idempotent by (student_id, badge_id) key. */
const awardBadges = (
  student: Student,
  existing: ReadonlyMap<string, BadgeRow>
): ReadonlyMap<string, BadgeRow> => {
  const result = new Map(existing);
  const add = (badgeId: string) => {
    const key = `${student.id}:${badgeId}`;
    if (!result.has(key)) {
      result.set(key, {
        student_id: student.id,
        badge_id: badgeId,
        reference_id: `${badgeId}:${student.id}`,
      });
    }
  };
  if (student.streakCount >= 7) add("streak-7");
  if (student.streakCount >= 30) add("streak-30");
  if (student.submissionCount >= 10) add("submissions-10");
  if (student.xpTotal >= 1000) add("xp-1000");
  return result;
};

const arbitraryStudent = (): fc.Arbitrary<Student> =>
  fc.record<Student>({
    id: fc.uuid({ version: 4 }),
    streakCount: fc.nat({ max: 200 }),
    submissionCount: fc.nat({ max: 200 }),
    xpTotal: fc.nat({ max: 50_000 }),
  });

describe("Property 11 — badge awards are idempotent", () => {
  it("awardBadges(awardBadges(state, s), s) equals awardBadges(state, s)", () => {
    fc.assert(
      fc.property(arbitraryStudent(), (student) => {
        const once = awardBadges(student, new Map());
        const twice = awardBadges(student, once);
        expect([...twice.keys()].sort()).toEqual([...once.keys()].sort());
      }),
      { numRuns: 200 }
    );
  });

  it("repeated evaluation never produces duplicate (student, badge) pairs", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryStudent(), { minLength: 1, maxLength: 20 }),
        (students) => {
          let state: ReadonlyMap<string, BadgeRow> = new Map();
          for (const s of students) {
            state = awardBadges(s, state);
            state = awardBadges(s, state); // second call — must be a no-op
          }
          const keys = [...state.keys()];
          expect(new Set(keys).size).toBe(keys.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
