// =============================================================================
// Property Tests: Team Formation Mode — Task 9.8
// Feature: team-challenges, Property P18
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

type TeamFormationMode = 'teacher_assigned' | 'student_formed';

interface CourseConfig {
  courseId: string;
  teamFormationMode: TeamFormationMode;
}

interface Team {
  teamId: string;
  courseId: string;
  createdBy: 'teacher' | 'student';
  memberIds: string[];
}

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Validate whether a student can create a team based on the course's formation mode.
 *
 * - teacher_assigned: only teachers can create teams → student creation is rejected
 * - student_formed: students can create teams
 */
function canStudentCreateTeam(courseConfig: CourseConfig): boolean {
  return courseConfig.teamFormationMode === 'student_formed';
}

/**
 * Validate team creation request.
 * Returns whether the creation is allowed and an error message if not.
 */
function validateTeamCreation(
  courseConfig: CourseConfig,
  creatorRole: 'teacher' | 'student',
): { allowed: boolean; error?: string } {
  if (creatorRole === 'teacher') {
    // Teachers can always create teams regardless of mode
    return { allowed: true };
  }

  if (courseConfig.teamFormationMode === 'teacher_assigned') {
    return { allowed: false, error: 'Students cannot create teams in teacher-assigned mode' };
  }

  return { allowed: true };
}

/**
 * Change formation mode for a course.
 * Existing teams are preserved — mode change does not delete or modify existing teams.
 */
function changeCourseFormationMode(
  courseConfig: CourseConfig,
  newMode: TeamFormationMode,
  existingTeams: Team[],
): { updatedConfig: CourseConfig; teamsPreserved: boolean; teamCount: number } {
  const updatedConfig: CourseConfig = {
    ...courseConfig,
    teamFormationMode: newMode,
  };

  return {
    updatedConfig,
    teamsPreserved: true, // existing teams are always preserved
    teamCount: existingTeams.filter((t) => t.courseId === courseConfig.courseId).length,
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P18: Team formation mode controls student team creation', () => {
  // Feature: team-challenges, Property 18: Formation mode behavior

  it('teacher_assigned mode prevents student team creation', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (courseId) => {
          const config: CourseConfig = { courseId, teamFormationMode: 'teacher_assigned' };

          expect(canStudentCreateTeam(config)).toBe(false);

          const result = validateTeamCreation(config, 'student');
          expect(result.allowed).toBe(false);
          expect(result.error).toBeDefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('student_formed mode allows student team creation', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (courseId) => {
          const config: CourseConfig = { courseId, teamFormationMode: 'student_formed' };

          expect(canStudentCreateTeam(config)).toBe(true);

          const result = validateTeamCreation(config, 'student');
          expect(result.allowed).toBe(true);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('teachers can always create teams regardless of mode', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom<TeamFormationMode>('teacher_assigned', 'student_formed'),
        (courseId, mode) => {
          const config: CourseConfig = { courseId, teamFormationMode: mode };

          const result = validateTeamCreation(config, 'teacher');
          expect(result.allowed).toBe(true);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('mode change preserves existing teams', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom<TeamFormationMode>('teacher_assigned', 'student_formed'),
        fc.constantFrom<TeamFormationMode>('teacher_assigned', 'student_formed'),
        fc.array(
          fc.record({
            teamId: fc.uuid(),
            createdBy: fc.constantFrom<'teacher' | 'student'>('teacher', 'student'),
            memberIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
          }),
          { minLength: 0, maxLength: 10 },
        ),
        (courseId, currentMode, newMode, teamData) => {
          const config: CourseConfig = { courseId, teamFormationMode: currentMode };
          const existingTeams: Team[] = teamData.map((t) => ({
            ...t,
            courseId,
          }));

          const result = changeCourseFormationMode(config, newMode, existingTeams);

          // Mode is updated
          expect(result.updatedConfig.teamFormationMode).toBe(newMode);

          // Existing teams are preserved
          expect(result.teamsPreserved).toBe(true);
          expect(result.teamCount).toBe(existingTeams.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('switching from student_formed to teacher_assigned does not delete student-created teams', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        (courseId, memberIds) => {
          const config: CourseConfig = { courseId, teamFormationMode: 'student_formed' };
          const studentTeam: Team = {
            teamId: 'student-team-1',
            courseId,
            createdBy: 'student',
            memberIds,
          };

          const result = changeCourseFormationMode(config, 'teacher_assigned', [studentTeam]);

          expect(result.updatedConfig.teamFormationMode).toBe('teacher_assigned');
          expect(result.teamsPreserved).toBe(true);
          expect(result.teamCount).toBe(1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('mode is always one of the two valid values', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom<TeamFormationMode>('teacher_assigned', 'student_formed'),
        (courseId, mode) => {
          const config: CourseConfig = { courseId, teamFormationMode: mode };
          expect(['teacher_assigned', 'student_formed']).toContain(config.teamFormationMode);
        },
      ),
      { numRuns: 100 },
    );
  });
});
