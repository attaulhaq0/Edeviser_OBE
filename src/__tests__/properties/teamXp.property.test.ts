// Feature: team-challenges, Property 4: Team XP respects membership period and course scope
// **Validates: Requirements 5.1, 5.4, 1.4, 18.1, 18.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Pure logic under test ────────────────────────────────────────────────────

interface XpTransaction {
  student_id: string;
  course_id: string;
  xp_amount: number;
  created_at: string;
}

interface TeamMembership {
  student_id: string;
  joined_at: string;
  left_at: string | null;
}

interface Team {
  id: string;
  course_id: string;
  members: TeamMembership[];
}

function computeTeamXp(team: Team, transactions: XpTransaction[]): number {
  let total = 0;
  for (const tx of transactions) {
    if (tx.course_id !== team.course_id) continue;
    const member = team.members.find((m) => m.student_id === tx.student_id);
    if (!member) continue;
    const txTime = new Date(tx.created_at).getTime();
    const joinTime = new Date(member.joined_at).getTime();
    const leftTime = member.left_at
      ? new Date(member.left_at).getTime()
      : Infinity;
    if (txTime >= joinTime && txTime <= leftTime) {
      total += tx.xp_amount;
    }
  }
  return total;
}

// ── Generators ───────────────────────────────────────────────────────────────

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 4: Team XP respects membership period and course scope", () => {
  it("XP from a different course is excluded", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamId, courseId, otherCourseId, studentId, xpAmount) => {
          fc.pre(courseId !== otherCourseId);
          const team: Team = {
            id: teamId,
            course_id: courseId,
            members: [
              {
                student_id: studentId,
                joined_at: "2024-01-01T00:00:00Z",
                left_at: null,
              },
            ],
          };
          const tx: XpTransaction = {
            student_id: studentId,
            course_id: otherCourseId,
            xp_amount: xpAmount,
            created_at: "2024-06-01T00:00:00Z",
          };
          expect(computeTeamXp(team, [tx])).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("XP earned before joining is excluded", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamId, courseId, studentId, xpAmount) => {
          const team: Team = {
            id: teamId,
            course_id: courseId,
            members: [
              {
                student_id: studentId,
                joined_at: "2024-06-01T00:00:00Z",
                left_at: null,
              },
            ],
          };
          const tx: XpTransaction = {
            student_id: studentId,
            course_id: courseId,
            xp_amount: xpAmount,
            created_at: "2024-01-01T00:00:00Z",
          };
          expect(computeTeamXp(team, [tx])).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("XP earned after leaving is excluded", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamId, courseId, studentId, xpAmount) => {
          const team: Team = {
            id: teamId,
            course_id: courseId,
            members: [
              {
                student_id: studentId,
                joined_at: "2024-01-01T00:00:00Z",
                left_at: "2024-03-01T00:00:00Z",
              },
            ],
          };
          const tx: XpTransaction = {
            student_id: studentId,
            course_id: courseId,
            xp_amount: xpAmount,
            created_at: "2024-06-01T00:00:00Z",
          };
          expect(computeTeamXp(team, [tx])).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("XP earned during active membership is included", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamId, courseId, studentId, xpAmount) => {
          const team: Team = {
            id: teamId,
            course_id: courseId,
            members: [
              {
                student_id: studentId,
                joined_at: "2024-01-01T00:00:00Z",
                left_at: null,
              },
            ],
          };
          const tx: XpTransaction = {
            student_id: studentId,
            course_id: courseId,
            xp_amount: xpAmount,
            created_at: "2024-06-01T00:00:00Z",
          };
          expect(computeTeamXp(team, [tx])).toBe(xpAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("team XP is sum of all valid member transactions", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 4 }),
        fc.array(fc.integer({ min: 1, max: 100 }), {
          minLength: 2,
          maxLength: 4,
        }),
        (teamId, courseId, studentIds, amounts) => {
          const members = studentIds.map((sid) => ({
            student_id: sid,
            joined_at: "2024-01-01T00:00:00Z",
            left_at: null,
          }));
          const team: Team = { id: teamId, course_id: courseId, members };
          const txs = studentIds.map((sid, i) => ({
            student_id: sid,
            course_id: courseId,
            xp_amount: amounts[i % amounts.length]!,
            created_at: "2024-06-01T00:00:00Z",
          }));
          const expected = txs.reduce((sum, tx) => sum + tx.xp_amount, 0);
          expect(computeTeamXp(team, txs)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
