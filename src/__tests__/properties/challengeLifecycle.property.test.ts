// Feature: team-challenges, Property 9: Auto-enrollment
// Feature: team-challenges, Property 19: Ended challenges reject updates
// Feature: team-challenges, Property 20: Challenge list filtering
// **Validates: Requirements 9.1-9.3, 9.5, 12.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure logic under test ────────────────────────────────────────────────────

type ChallengeStatus = 'draft' | 'active' | 'ended' | 'cancelled';
type ParticipationMode = 'team' | 'individual';

interface Challenge {
  id: string;
  course_id: string;
  status: ChallengeStatus;
  participation_mode: ParticipationMode;
}

interface ProgressRecord {
  challenge_id: string;
  participant_id: string;
  current_progress: number;
}

function autoEnroll(
  challenge: Challenge,
  teamIds: string[],
  studentIds: string[],
): ProgressRecord[] {
  if (challenge.status !== 'active') return [];
  const participants = challenge.participation_mode === 'team' ? teamIds : studentIds;
  return participants.map((pid) => ({
    challenge_id: challenge.id,
    participant_id: pid,
    current_progress: 0,
  }));
}

function canUpdateProgress(status: ChallengeStatus): boolean {
  return status === 'active';
}

function filterChallengesForStudent(
  challenges: Challenge[],
  enrolledCourseIds: string[],
): Challenge[] {
  const courseSet = new Set(enrolledCourseIds);
  return challenges.filter(
    (c) => courseSet.has(c.course_id) && (c.status === 'active' || c.status === 'ended'),
  );
}

// ── Generators ───────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom<ChallengeStatus>('draft', 'active', 'ended', 'cancelled');
const modeArb = fc.constantFrom<ParticipationMode>('team', 'individual');

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Property 9: Challenge auto-enrollment creates progress records', () => {
  it('team mode creates one record per team', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (challengeId, courseId, teamIds, studentIds) => {
          const challenge: Challenge = {
            id: challengeId,
            course_id: courseId,
            status: 'active',
            participation_mode: 'team',
          };
          const records = autoEnroll(challenge, teamIds, studentIds);
          expect(records.length).toBe(teamIds.length);
          for (const r of records) {
            expect(r.current_progress).toBe(0);
            expect(r.challenge_id).toBe(challengeId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('individual mode creates one record per student', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (challengeId, courseId, teamIds, studentIds) => {
          const challenge: Challenge = {
            id: challengeId,
            course_id: courseId,
            status: 'active',
            participation_mode: 'individual',
          };
          const records = autoEnroll(challenge, teamIds, studentIds);
          expect(records.length).toBe(studentIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-active challenges produce no enrollment records', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom<ChallengeStatus>('draft', 'ended', 'cancelled'),
        modeArb,
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (challengeId, courseId, status, mode, teamIds, studentIds) => {
          const challenge: Challenge = { id: challengeId, course_id: courseId, status, participation_mode: mode };
          const records = autoEnroll(challenge, teamIds, studentIds);
          expect(records.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 19: Ended challenges reject progress updates', () => {
  it('ended challenges reject updates', () => {
    fc.assert(
      fc.property(fc.constant('ended' as ChallengeStatus), (status) => {
        expect(canUpdateProgress(status)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('active challenges accept updates', () => {
    fc.assert(
      fc.property(fc.constant('active' as ChallengeStatus), (status) => {
        expect(canUpdateProgress(status)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('draft and cancelled challenges reject updates', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ChallengeStatus>('draft', 'cancelled'),
        (status) => {
          expect(canUpdateProgress(status)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 20: Challenge list filtering by enrollment', () => {
  it('only returns challenges from enrolled courses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            course_id: fc.uuid(),
            status: fc.constantFrom<ChallengeStatus>('active', 'ended'),
            participation_mode: modeArb,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (challenges, enrolledCourseIds) => {
          const filtered = filterChallengesForStudent(challenges, enrolledCourseIds);
          const courseSet = new Set(enrolledCourseIds);
          for (const c of filtered) {
            expect(courseSet.has(c.course_id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('only returns active or ended challenges', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            course_id: fc.uuid(),
            status: statusArb,
            participation_mode: modeArb,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (challenges, enrolledCourseIds) => {
          const filtered = filterChallengesForStudent(challenges, enrolledCourseIds);
          for (const c of filtered) {
            expect(['active', 'ended']).toContain(c.status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
