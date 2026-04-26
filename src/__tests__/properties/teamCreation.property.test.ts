// =============================================================================
// Property Tests: Team Creation — Task 9.1
// Feature: team-challenges, Properties P1, P2, P3
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure logic under test ───────────────────────────────────────────────────

const MIN_TEAM_SIZE = 2;
const MAX_TEAM_SIZE = 6;

interface TeamCreationInput {
  name: string;
  courseId: string;
  memberIds: string[];
}

interface TeamCreationResult {
  captainId: string;
  memberCount: number;
  isValid: boolean;
  error?: string;
}

function validateTeamCreation(input: TeamCreationInput): TeamCreationResult {
  const memberCount = input.memberIds.length;

  if (memberCount < MIN_TEAM_SIZE) {
    return { captainId: '', memberCount, isValid: false, error: 'Team must have at least 2 members' };
  }
  if (memberCount > MAX_TEAM_SIZE) {
    return { captainId: '', memberCount, isValid: false, error: 'Team cannot exceed 6 members' };
  }

  // First member is captain by default
  const captainId = input.memberIds[0]!;

  return { captainId, memberCount, isValid: true };
}

function checkOneTeamPerStudentPerCourse(
  existingTeams: Array<{ courseId: string; memberIds: string[] }>,
  newCourseId: string,
  newMemberIds: string[],
): { valid: boolean; conflictingStudentId?: string } {
  for (const team of existingTeams) {
    if (team.courseId !== newCourseId) continue;
    for (const memberId of newMemberIds) {
      if (team.memberIds.includes(memberId)) {
        return { valid: false, conflictingStudentId: memberId };
      }
    }
  }
  return { valid: true };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P1: Captain assignment', () => {
  it('first listed student is always designated as captain', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        (name, courseId, memberIds) => {
          const result = validateTeamCreation({ name, courseId, memberIds });
          if (result.isValid) {
            expect(result.captainId).toBe(memberIds[0]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P2: One team per student per course', () => {
  it('rejects adding a student who is already on a team in the same course', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // courseId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }), // existing team members
        fc.uuid(), // new student who is also in existing team
        (courseId, existingMembers, _extraStudent) => {
          // Pick a student from existing team to try adding to new team
          const conflictStudent = existingMembers[0]!;
          const newMembers = [conflictStudent, _extraStudent];

          const existingTeams = [{ courseId, memberIds: existingMembers }];
          const result = checkOneTeamPerStudentPerCourse(existingTeams, courseId, newMembers);

          expect(result.valid).toBe(false);
          expect(result.conflictingStudentId).toBe(conflictStudent);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('allows a student to be on teams in different courses', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // course1
        fc.uuid(), // course2
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        (course1, course2, members) => {
          fc.pre(course1 !== course2);

          const existingTeams = [{ courseId: course1, memberIds: members }];
          const result = checkOneTeamPerStudentPerCourse(existingTeams, course2, members);

          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P3: Team size bounds 2-6', () => {
  it('rejects teams with fewer than 2 members', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 1 }),
        (name, courseId, memberIds) => {
          const result = validateTeamCreation({ name, courseId, memberIds });
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('at least 2');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects teams with more than 6 members', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 7, maxLength: 20 }),
        (name, courseId, memberIds) => {
          const result = validateTeamCreation({ name, courseId, memberIds });
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('exceed 6');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('accepts teams with 2-6 members', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.uuid(),
        fc.integer({ min: 2, max: 6 }).chain((size) =>
          fc.array(fc.uuid(), { minLength: size, maxLength: size }),
        ),
        (name, courseId, memberIds) => {
          const result = validateTeamCreation({ name, courseId, memberIds });
          expect(result.isValid).toBe(true);
          expect(result.memberCount).toBeGreaterThanOrEqual(2);
          expect(result.memberCount).toBeLessThanOrEqual(6);
        },
      ),
      { numRuns: 200 },
    );
  });
});
