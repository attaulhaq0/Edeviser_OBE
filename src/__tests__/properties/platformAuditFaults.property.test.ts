// Feature: platform-audit-fixes, Property 1: Fault Condition — Platform Audit Defects (17 Bugs)
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.8, 2.11, 2.12, 2.13, 2.16**
//
// CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
// DO NOT fix source code or tests when they fail.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { XP_SCHEDULE } from '@/lib/xpSchedule';
import { sanitizePostgrestValue } from '@/lib/sanitizeFilter';

// Resolve the src root for fs-based source reading
const srcRoot = path.resolve(__dirname, '../../..');

// ─── 1. XP Schedule Values ─────────────────────────────────────────────────
// **Validates: Requirements 2.13**
// Domain spec: submission=25, grade=15, streak_milestone=50, first_attempt_bonus=10
// Bug: currently submission=50, grade=25, streak_milestone=100, first_attempt_bonus=25

describe('1. XP Schedule fault condition', () => {
  const domainSpec: Record<string, number> = {
    submission: 25,
    grade: 15,
    streak_milestone: 50,
    first_attempt_bonus: 10,
  };

  it('XP_SCHEDULE values match domain specification for all affected sources', () => {
    const affectedSources = Object.keys(domainSpec);

    fc.assert(
      fc.property(
        fc.constantFrom(...affectedSources),
        (source: string) => {
          const actual = XP_SCHEDULE[source as keyof typeof XP_SCHEDULE];
          expect(actual).toBe(domainSpec[source]);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── 2. Query Key Consistency ───────────────────────────────────────────────
// **Validates: Requirements 2.2**
// All dashboard hooks must use queryKeys factory, not ad-hoc string arrays

describe('2. Query key consistency fault condition', () => {
  const dashboardHookFiles = [
    'src/hooks/useAdminDashboard.ts',
    'src/hooks/useStudentDashboard.ts',
    'src/hooks/useTeacherDashboard.ts',
    'src/hooks/useCoordinatorDashboard.ts',
    'src/hooks/useParentDashboard.ts',
  ];

  it('all dashboard hooks import and use queryKeys factory (not ad-hoc arrays)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...dashboardHookFiles),
        (relPath: string) => {
          const filePath = path.join(srcRoot, relPath);
          const source = fs.readFileSync(filePath, 'utf-8');

          // Must import queryKeys
          expect(source).toContain("import { queryKeys }");
          // Must reference queryKeys. in query key definitions
          expect(source).toContain('queryKeys.');
          // Must NOT use ad-hoc string array patterns like ['admin', 'kpis']
          const adHocPattern = /queryKey:\s*\[\s*['"][a-z]+['"]\s*,\s*['"][a-z]/;
          expect(adHocPattern.test(source)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── 3. Column Name Mismatches ──────────────────────────────────────────────
// **Validates: Requirements 2.3, 2.4**
// useStudentDashboard must read streak_count (not current_streak or streak_current)
// useStudentDashboard must read level (not current_level)
// useStudentDashboard must read attainment_percent (not score_percent)

describe('3. Column name fault condition', () => {
  it('useStudentDashboard reads streak_count from student_gamification', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The gamification select query must include streak_count (matching process-streak writes)
    // Bug: code currently uses streak_current instead of streak_count
    const gamificationSelectMatch = source.match(
      /\.from\(['"]student_gamification['"]\)\s*\.select\(['"]([^'"]+)['"]/s,
    );
    expect(gamificationSelectMatch).not.toBeNull();
    const selectColumns = gamificationSelectMatch![1];
    expect(selectColumns).toContain('streak_count');
  });

  it('useStudentDashboard reads attainment_percent from outcome_attainment', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Must use attainment_percent (matching calculate-attainment-rollup writes)
    expect(source).toContain('attainment_percent');
    // Must NOT use score_percent
    expect(source).not.toContain('score_percent');
  });

  it('useParentDashboard reads streak_count from student_gamification', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useParentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The gamification select query must include streak_count
    // Bug: code currently uses streak_current instead of streak_count
    const gamificationSelectMatch = source.match(
      /\.from\(['"]student_gamification['"]\)\s*\.select\(['"]([^'"]+)['"]/s,
    );
    expect(gamificationSelectMatch).not.toBeNull();
    const selectColumns = gamificationSelectMatch![1];
    expect(selectColumns).toContain('streak_count');
  });
});


// ─── 4. PostgREST Filter Sanitization ───────────────────────────────────────
// **Validates: Requirements 2.12**
// sanitizePostgrestValue must escape all PostgREST special chars: . , ( ) % *

describe('4. PostgREST filter sanitization fault condition', () => {
  const postgrestSpecialChars = ['.', ',', '(', ')', '%', '*'];

  it('sanitizePostgrestValue escapes all PostgREST special characters', () => {
    // Generate strings that contain at least one PostgREST special character
    const charArb = fc.constantFrom(...postgrestSpecialChars, 'a', 'b', 'c', '1', '2', ' ');
    const stringArb = fc.array(charArb, { minLength: 1, maxLength: 50 }).map((chars) => chars.join(''));

    fc.assert(
      fc.property(
        stringArb,
        (input: string) => {
          const sanitized = sanitizePostgrestValue(input);

          // Every special char in the input must be escaped with backslash in output
          for (const char of postgrestSpecialChars) {
            if (input.includes(char)) {
              expect(sanitized).toContain(`\\${char}`);
            }
          }

          // The sanitized output must not contain any unescaped special chars
          // (every special char must be preceded by a backslash)
          for (const char of postgrestSpecialChars) {
            const unescapedPattern = new RegExp(`(?<!\\\\)\\${char}`);
            expect(unescapedPattern.test(sanitized)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── 5. Audit Logging Coverage ──────────────────────────────────────────────
// **Validates: Requirements 2.8**
// All mutation hooks in CLO, assignment, rubric, enrollment, grade, submission
// must call logAuditEvent

describe('5. Audit logging coverage fault condition', () => {
  const hookFiles: Array<{ file: string; label: string; expectedEntityTypes: string[] }> = [
    { file: 'src/hooks/useCLOs.ts', label: 'useCLOs', expectedEntityTypes: ['clo'] },
    { file: 'src/hooks/useAssignments.ts', label: 'useAssignments', expectedEntityTypes: ['assignment'] },
    { file: 'src/hooks/useRubrics.ts', label: 'useRubrics', expectedEntityTypes: ['rubric'] },
    { file: 'src/hooks/useEnrollments.ts', label: 'useEnrollments', expectedEntityTypes: ['enrollment'] },
    { file: 'src/hooks/useGrades.ts', label: 'useGrades', expectedEntityTypes: ['grade'] },
    { file: 'src/hooks/useSubmissions.ts', label: 'useSubmissions', expectedEntityTypes: ['submission'] },
  ];

  it('all mutation hooks import and call logAuditEvent', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...hookFiles),
        ({ file, expectedEntityTypes }: { file: string; expectedEntityTypes: string[] }) => {
          const filePath = path.join(srcRoot, file);
          const source = fs.readFileSync(filePath, 'utf-8');

          // Must import logAuditEvent
          expect(source).toContain('logAuditEvent');

          // Must call logAuditEvent with the correct entity_type
          for (const entityType of expectedEntityTypes) {
            expect(source).toContain(`entity_type: '${entityType}'`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── 6. Course Name Display ─────────────────────────────────────────────────
// **Validates: Requirements 2.16**
// useUpcomingDeadlines must join to courses table for actual course name

describe('6. Course name display fault condition', () => {
  it('useUpcomingDeadlines joins to courses table for course name', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The assignments query must include a join to courses for the name
    expect(source).toContain('courses(name)');

    // Must NOT use truncated UUID pattern like course_id.slice(0, 8)
    expect(source).not.toMatch(/course_id\.slice\(/);
  });
});

// ─── 7. Edge Function Permission Check ──────────────────────────────────────
// **Validates: Requirements 2.11**
// award-xp must reject non-service-role callers awarding XP to other students

describe('7. Edge function permission fault condition', () => {
  it('award-xp edge function validates caller permissions', () => {
    const filePath = path.join(srcRoot, 'supabase/functions/award-xp/index.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Must check authorization header
    expect(source).toContain('Authorization');

    // Must have service_role check
    expect(source).toMatch(/service.?role/i);

    // Must return 403 for unauthorized requests
    expect(source).toContain('403');

    // Must have permission/forbidden error messaging
    const hasPermissionDenial =
      source.includes('Forbidden') || source.includes('permission') || source.includes('unauthorized');
    expect(hasPermissionDenial).toBe(true);
  });
});
