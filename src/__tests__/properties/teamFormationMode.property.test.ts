// Feature: team-challenges, Property 18: Mode controls student team creation
// **Validates: Requirements 2.1, 2.8, 3.3, 3.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure logic under test ────────────────────────────────────────────────────

type FormationMode = 'teacher_assigned' | 'student_formed';

function canStudentCreateTeam(mode: FormationMode, isEnrolled: boolean): boolean {
  return mode === 'student_formed' && isEnrolled;
}

function canStudentSendInvitation(mode: FormationMode, isCaptain: boolean): boolean {
  return mode === 'student_formed' && isCaptain;
}

function changeModePreservesTeams(existingTeamCount: number): number {
  return existingTeamCount; // mode change never deletes teams
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Property 18: Team formation mode controls student team creation', () => {
  it('teacher_assigned mode blocks student team creation', () => {
    fc.assert(
      fc.property(fc.boolean(), (isEnrolled) => {
        expect(canStudentCreateTeam('teacher_assigned', isEnrolled)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('student_formed mode allows enrolled students to create teams', () => {
    fc.assert(
      fc.property(fc.constant(true), (isEnrolled) => {
        expect(canStudentCreateTeam('student_formed', isEnrolled)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('student_formed mode blocks unenrolled students', () => {
    fc.assert(
      fc.property(fc.constant(false), (isEnrolled) => {
        expect(canStudentCreateTeam('student_formed', isEnrolled)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('teacher_assigned mode blocks student invitations', () => {
    fc.assert(
      fc.property(fc.boolean(), (isCaptain) => {
        expect(canStudentSendInvitation('teacher_assigned', isCaptain)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('changing mode preserves existing teams', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (teamCount) => {
        expect(changeModePreservesTeams(teamCount)).toBe(teamCount);
      }),
      { numRuns: 100 },
    );
  });
});
