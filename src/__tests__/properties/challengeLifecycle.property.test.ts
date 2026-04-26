// =============================================================================
// Property Tests: Challenge Lifecycle — Task 9.9
// Feature: team-challenges, Properties P9, P19, P20
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChallengeStatus = 'active' | 'upcoming' | 'ended';
type ParticipationMode = 'team' | 'individual';

interface Challenge {
  challengeId: string;
  courseId: string;
  status: ChallengeStatus;
  participationMode: ParticipationMode;
  startDate: string;
  endDate: string;
}

interface ProgressRecord {
  challengeId: string;
  participantId: string;
  currentProgress: number;
}

interface Team {
  teamId: string;
  courseId: string;
}

interface Student {
  studentId: string;
  enrolledCourseIds: string[];
}

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Auto-enrollment: when a challenge starts, create progress records
 * for all teams (team mode) or all enrolled students (individual mode).
 */
function autoEnroll(
  challenge: Challenge,
  teams: Team[],
  students: Student[],
): ProgressRecord[] {
  if (challenge.participationMode === 'team') {
    const courseTeams = teams.filter((t) => t.courseId === challenge.courseId);
    return courseTeams.map((team) => ({
      challengeId: challenge.challengeId,
      participantId: team.teamId,
      currentProgress: 0,
    }));
  }

  // Individual mode
  const enrolledStudents = students.filter((s) =>
    s.enrolledCourseIds.includes(challenge.courseId),
  );
  return enrolledStudents.map((student) => ({
    challengeId: challenge.challengeId,
    participantId: student.studentId,
    currentProgress: 0,
  }));
}

/**
 * Validate whether a progress update is allowed.
 * Ended challenges reject progress updates.
 */
function canUpdateProgress(challenge: Challenge): { allowed: boolean; error?: string } {
  if (challenge.status === 'ended') {
    return { allowed: false, error: 'Cannot update progress on an ended challenge' };
  }
  if (challenge.status === 'upcoming') {
    return { allowed: false, error: 'Challenge has not started yet' };
  }
  return { allowed: true };
}

/**
 * Determine challenge status based on current date relative to start/end dates.
 */
function computeChallengeStatus(startDate: string, endDate: string, now: string): ChallengeStatus {
  if (now < startDate) return 'upcoming';
  if (now > endDate) return 'ended';
  return 'active';
}

/**
 * Filter challenges for a student: only challenges from enrolled courses,
 * returning active, upcoming, and ended challenges.
 */
function filterChallengesForStudent(
  challenges: Challenge[],
  enrolledCourseIds: string[],
): Challenge[] {
  const enrolledSet = new Set(enrolledCourseIds);
  return challenges.filter((c) => enrolledSet.has(c.courseId));
}

// ─── Generators ──────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom<ChallengeStatus>('active', 'upcoming', 'ended');
const modeArb = fc.constantFrom<ParticipationMode>('team', 'individual');

const challengeArb = fc.record({
  challengeId: fc.uuid(),
  courseId: fc.uuid(),
  status: statusArb,
  participationMode: modeArb,
  startDate: fc.constant('2025-06-01'),
  endDate: fc.constant('2025-06-30'),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P9: Auto-enrollment creates progress records for all participants', () => {
  // Feature: team-challenges, Property 9: Auto-enrollment

  it('team mode: creates progress records for all teams in the course', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // challengeId
        fc.uuid(), // courseId
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // team IDs
        (challengeId, courseId, teamIds) => {
          const uniqueTeamIds = [...new Set(teamIds)];
          const challenge: Challenge = {
            challengeId,
            courseId,
            status: 'active',
            participationMode: 'team',
            startDate: '2025-06-01',
            endDate: '2025-06-30',
          };
          const teams: Team[] = uniqueTeamIds.map((id) => ({ teamId: id, courseId }));

          const records = autoEnroll(challenge, teams, []);

          expect(records).toHaveLength(uniqueTeamIds.length);
          for (const record of records) {
            expect(record.challengeId).toBe(challengeId);
            expect(record.currentProgress).toBe(0);
            expect(uniqueTeamIds).toContain(record.participantId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('individual mode: creates progress records for all enrolled students', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // challengeId
        fc.uuid(), // courseId
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }), // student IDs
        (challengeId, courseId, studentIds) => {
          const uniqueStudentIds = [...new Set(studentIds)];
          const challenge: Challenge = {
            challengeId,
            courseId,
            status: 'active',
            participationMode: 'individual',
            startDate: '2025-06-01',
            endDate: '2025-06-30',
          };
          const students: Student[] = uniqueStudentIds.map((id) => ({
            studentId: id,
            enrolledCourseIds: [courseId],
          }));

          const records = autoEnroll(challenge, [], students);

          expect(records).toHaveLength(uniqueStudentIds.length);
          for (const record of records) {
            expect(record.challengeId).toBe(challengeId);
            expect(record.currentProgress).toBe(0);
            expect(uniqueStudentIds).toContain(record.participantId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('teams from other courses are not enrolled', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (challengeId, targetCourse, otherCourse, targetTeamIds, otherTeamIds) => {
          fc.pre(targetCourse !== otherCourse);

          const challenge: Challenge = {
            challengeId,
            courseId: targetCourse,
            status: 'active',
            participationMode: 'team',
            startDate: '2025-06-01',
            endDate: '2025-06-30',
          };

          const teams: Team[] = [
            ...[...new Set(targetTeamIds)].map((id) => ({ teamId: id, courseId: targetCourse })),
            ...[...new Set(otherTeamIds)].map((id) => ({ teamId: id, courseId: otherCourse })),
          ];

          const records = autoEnroll(challenge, teams, []);
          const enrolledIds = new Set(records.map((r) => r.participantId));
          const otherIds = new Set(otherTeamIds);

          for (const id of otherIds) {
            // Other course teams should not be enrolled (unless they happen to share an ID with target)
            if (!new Set(targetTeamIds).has(id)) {
              expect(enrolledIds.has(id)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all progress records start at 0', () => {
    fc.assert(
      fc.property(
        challengeArb,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (challenge, participantIds) => {
          const uniqueIds = [...new Set(participantIds)];
          const teams: Team[] = uniqueIds.map((id) => ({ teamId: id, courseId: challenge.courseId }));
          const students: Student[] = uniqueIds.map((id) => ({
            studentId: id,
            enrolledCourseIds: [challenge.courseId],
          }));

          const records = autoEnroll(challenge, teams, students);

          for (const record of records) {
            expect(record.currentProgress).toBe(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P19: Ended challenges reject progress updates', () => {
  // Feature: team-challenges, Property 19: Ended challenge rejection

  it('ended challenges reject progress updates', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        modeArb,
        (challengeId, courseId, mode) => {
          const challenge: Challenge = {
            challengeId,
            courseId,
            status: 'ended',
            participationMode: mode,
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          };

          const result = canUpdateProgress(challenge);
          expect(result.allowed).toBe(false);
          expect(result.error).toContain('ended');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('active challenges allow progress updates', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        modeArb,
        (challengeId, courseId, mode) => {
          const challenge: Challenge = {
            challengeId,
            courseId,
            status: 'active',
            participationMode: mode,
            startDate: '2025-06-01',
            endDate: '2025-06-30',
          };

          const result = canUpdateProgress(challenge);
          expect(result.allowed).toBe(true);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('upcoming challenges reject progress updates', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        modeArb,
        (challengeId, courseId, mode) => {
          const challenge: Challenge = {
            challengeId,
            courseId,
            status: 'upcoming',
            participationMode: mode,
            startDate: '2025-12-01',
            endDate: '2025-12-31',
          };

          const result = canUpdateProgress(challenge);
          expect(result.allowed).toBe(false);
          expect(result.error).toContain('not started');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('status computation is consistent with date ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 1, max: 12 }),
        (day, month) => {
          const startDate = '2025-06-01';
          const endDate = '2025-06-30';
          const paddedMonth = String(month).padStart(2, '0');
          const paddedDay = String(day).padStart(2, '0');
          const now = `2025-${paddedMonth}-${paddedDay}`;

          const status = computeChallengeStatus(startDate, endDate, now);

          if (now < startDate) {
            expect(status).toBe('upcoming');
          } else if (now > endDate) {
            expect(status).toBe('ended');
          } else {
            expect(status).toBe('active');
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P20: Challenge list returns only challenges for enrolled courses', () => {
  // Feature: team-challenges, Property 20: Challenge list filtering

  it('only challenges from enrolled courses are returned', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }), // enrolled courses
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }), // other courses
        fc.array(statusArb, { minLength: 1, maxLength: 10 }),
        (enrolledCourses, otherCourses, statuses) => {
          const uniqueEnrolled = [...new Set(enrolledCourses)];
          const uniqueOther = [...new Set(otherCourses)].filter((c) => !uniqueEnrolled.includes(c));

          const challenges: Challenge[] = statuses.map((status, i) => ({
            challengeId: `challenge-${i}`,
            courseId: i % 2 === 0 && uniqueEnrolled.length > 0
              ? uniqueEnrolled[i % uniqueEnrolled.length]!
              : uniqueOther.length > 0
                ? uniqueOther[i % Math.max(uniqueOther.length, 1)]!
                : uniqueEnrolled[0]!,
            status,
            participationMode: 'individual',
            startDate: '2025-06-01',
            endDate: '2025-06-30',
          }));

          const filtered = filterChallengesForStudent(challenges, uniqueEnrolled);

          for (const challenge of filtered) {
            expect(uniqueEnrolled).toContain(challenge.courseId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('challenges from non-enrolled courses are excluded', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        statusArb,
        (enrolledCourse, otherCourse, status) => {
          fc.pre(enrolledCourse !== otherCourse);

          const challenges: Challenge[] = [
            { challengeId: 'c1', courseId: otherCourse, status, participationMode: 'individual', startDate: '2025-06-01', endDate: '2025-06-30' },
          ];

          const filtered = filterChallengesForStudent(challenges, [enrolledCourse]);
          expect(filtered).toHaveLength(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all statuses (active, upcoming, ended) are included for enrolled courses', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (courseId) => {
          const challenges: Challenge[] = [
            { challengeId: 'c1', courseId, status: 'active', participationMode: 'individual', startDate: '2025-06-01', endDate: '2025-06-30' },
            { challengeId: 'c2', courseId, status: 'upcoming', participationMode: 'team', startDate: '2025-07-01', endDate: '2025-07-31' },
            { challengeId: 'c3', courseId, status: 'ended', participationMode: 'individual', startDate: '2025-05-01', endDate: '2025-05-31' },
          ];

          const filtered = filterChallengesForStudent(challenges, [courseId]);

          expect(filtered).toHaveLength(3);
          const statuses = filtered.map((c) => c.status);
          expect(statuses).toContain('active');
          expect(statuses).toContain('upcoming');
          expect(statuses).toContain('ended');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtered count is always <= total challenge count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(challengeArb, { minLength: 0, maxLength: 20 }),
        (enrolledCourses, challenges) => {
          const filtered = filterChallengesForStudent(challenges, enrolledCourses);
          expect(filtered.length).toBeLessThanOrEqual(challenges.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
