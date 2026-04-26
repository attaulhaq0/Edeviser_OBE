// =============================================================================
// Property Tests: Team XP Membership & Course Scope — Task 9.2
// Feature: team-challenges, Property P4
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Pure logic under test ───────────────────────────────────────────────────

interface XpTransaction {
  studentId: string;
  courseId: string;
  xpAmount: number;
  earnedAt: number; // epoch ms
}

interface TeamMembership {
  studentId: string;
  joinedAt: number; // epoch ms
  leftAt: number | null; // epoch ms or null if still active
}

/**
 * Compute team XP = sum of member XP earned during active membership,
 * scoped to a specific course.
 *
 * Rules:
 * - Only XP from the specified course counts
 * - Only XP earned while the member was active (joinedAt <= earnedAt, and leftAt is null or earnedAt <= leftAt)
 * - XP earned before joining or after leaving is excluded
 */
function computeTeamXp(
  memberships: TeamMembership[],
  transactions: XpTransaction[],
  teamCourseId: string,
): number {
  let total = 0;

  for (const tx of transactions) {
    // Must be scoped to the team's course
    if (tx.courseId !== teamCourseId) continue;

    // Check if any active membership covers this transaction
    const coveredByMembership = memberships.some((m) => {
      if (m.studentId !== tx.studentId) return false;
      if (tx.earnedAt < m.joinedAt) return false;
      if (m.leftAt !== null && tx.earnedAt > m.leftAt) return false;
      return true;
    });

    if (coveredByMembership) {
      total += tx.xpAmount;
    }
  }

  return total;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const epochArb = fc.integer({ min: 1700000000000, max: 1800000000000 });

const membershipArb = fc.record({
  studentId: fc.uuid(),
  joinedAt: epochArb,
  leftAt: fc.oneof(fc.constant(null), epochArb),
}).map((m) => {
  // Ensure leftAt > joinedAt when present
  if (m.leftAt !== null && m.leftAt <= m.joinedAt) {
    return { ...m, leftAt: m.joinedAt + Math.abs(m.leftAt - m.joinedAt) + 1 };
  }
  return m;
});

// Remove unused generator
// const _txArb was here

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P4: Team XP respects membership period and course scope', () => {
  // Feature: team-challenges, Property 4: Team XP membership period and course scope

  it('team XP equals sum of member XP during active membership, scoped to course', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // teamCourseId
        fc.uuid(), // otherCourseId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }), // student IDs
        (teamCourseId, otherCourseId, studentIds) => {
          fc.pre(teamCourseId !== otherCourseId);
          fc.pre(new Set(studentIds).size === studentIds.length);

          // Create memberships for all students
          const baseJoin = 1750000000000;
          const memberships: TeamMembership[] = studentIds.map((sid, i) => ({
            studentId: sid,
            joinedAt: baseJoin + i * 86400000,
            leftAt: null,
          }));

          // Create XP transactions during membership period
          const transactions: XpTransaction[] = studentIds.map((sid, i) => ({
            studentId: sid,
            courseId: teamCourseId,
            xpAmount: 100,
            earnedAt: baseJoin + i * 86400000 + 3600000, // 1 hour after joining
          }));

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);

          // Each member earned 100 XP during membership → total = 100 × memberCount
          expect(teamXp).toBe(100 * studentIds.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('XP earned before joining is excluded', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamCourseId, studentId, xpAmount) => {
          const joinedAt = 1750000000000;

          const memberships: TeamMembership[] = [
            { studentId, joinedAt, leftAt: null },
          ];

          // Transaction BEFORE joining
          const transactions: XpTransaction[] = [
            { studentId, courseId: teamCourseId, xpAmount, earnedAt: joinedAt - 1000 },
          ];

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);
          expect(teamXp).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('XP earned after leaving is excluded', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamCourseId, studentId, xpAmount) => {
          const joinedAt = 1750000000000;
          const leftAt = joinedAt + 86400000; // left 1 day later

          const memberships: TeamMembership[] = [
            { studentId, joinedAt, leftAt },
          ];

          // Transaction AFTER leaving
          const transactions: XpTransaction[] = [
            { studentId, courseId: teamCourseId, xpAmount, earnedAt: leftAt + 1000 },
          ];

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);
          expect(teamXp).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('XP from different courses is excluded', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 500 }),
        (teamCourseId, otherCourseId, studentId, xpAmount) => {
          fc.pre(teamCourseId !== otherCourseId);

          const joinedAt = 1750000000000;
          const memberships: TeamMembership[] = [
            { studentId, joinedAt, leftAt: null },
          ];

          // Transaction in a DIFFERENT course
          const transactions: XpTransaction[] = [
            { studentId, courseId: otherCourseId, xpAmount, earnedAt: joinedAt + 3600000 },
          ];

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);
          expect(teamXp).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('team XP is non-negative for any valid input', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(membershipArb, { minLength: 1, maxLength: 6 }),
        (teamCourseId, memberships) => {
          const studentIds = [...new Set(memberships.map((m) => m.studentId))];
          if (studentIds.length === 0) return;

          const transactions: XpTransaction[] = studentIds.map((sid) => ({
            studentId: sid,
            courseId: teamCourseId,
            xpAmount: 50,
            earnedAt: 1750000000000,
          }));

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);
          expect(teamXp).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('XP during membership is included, XP outside is excluded (mixed scenario)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 10, max: 200 }),
        fc.integer({ min: 10, max: 200 }),
        fc.integer({ min: 10, max: 200 }),
        (teamCourseId, studentId, xpBefore, xpDuring, xpAfter) => {
          const joinedAt = 1750000000000;
          const leftAt = joinedAt + 86400000 * 7; // 7 days

          const memberships: TeamMembership[] = [
            { studentId, joinedAt, leftAt },
          ];

          const transactions: XpTransaction[] = [
            { studentId, courseId: teamCourseId, xpAmount: xpBefore, earnedAt: joinedAt - 1000 },
            { studentId, courseId: teamCourseId, xpAmount: xpDuring, earnedAt: joinedAt + 3600000 },
            { studentId, courseId: teamCourseId, xpAmount: xpAfter, earnedAt: leftAt + 1000 },
          ];

          const teamXp = computeTeamXp(memberships, transactions, teamCourseId);
          expect(teamXp).toBe(xpDuring);
        },
      ),
      { numRuns: 200 },
    );
  });
});
