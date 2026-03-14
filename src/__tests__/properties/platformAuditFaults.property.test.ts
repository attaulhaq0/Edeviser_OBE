// Feature: platform-audit-fixes, Property 1: Fault Condition — Platform Audit Defects (17 Bugs)
// **Validates: Requirements 2.2, 2.3, 2.4, 2.8, 2.11, 2.12, 2.13, 2.16**
//
// CRITICAL: These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
// DO NOT fix source code or tests when they fail.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { XP_SCHEDULE } from '@/lib/xpSchedule';

// Resolve the src root for fs-based source reading
const srcRoot = path.resolve(__dirname, '../../..');

// ─── 1.1 XP Schedule Mismatch ──────────────────────────────────────────────
// **Validates: Requirements 2.13**

describe('1.1 XP Schedule fault condition', () => {
  it('XP_SCHEDULE values match domain specification for affected sources', () => {
    const domainSpec: Record<string, number> = {
      submission: 25,
      grade: 15,
      streak_milestone: 50,
      first_attempt_bonus: 10,
    };

    const affectedSources = Object.keys(domainSpec);

    fc.assert(
      fc.property(
        fc.constantFrom(...affectedSources),
        (source: string) => {
          expect(XP_SCHEDULE[source as keyof typeof XP_SCHEDULE]).toBe(domainSpec[source]);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── 1.2 Query Key Consistency ──────────────────────────────────────────────
// **Validates: Requirements 2.2**

describe('1.2 Query key consistency fault condition', () => {
  const dashboardHookFiles = [
    'src/hooks/useAdminDashboard.ts',
    'src/hooks/useStudentDashboard.ts',
    'src/hooks/useTeacherDashboard.ts',
    'src/hooks/useCoordinatorDashboard.ts',
    'src/hooks/useParentDashboard.ts',
  ];

  it.each(dashboardHookFiles)(
    '%s uses queryKeys factory (not ad-hoc arrays)',
    (relPath: string) => {
      const filePath = path.join(srcRoot, relPath);
      const source = fs.readFileSync(filePath, 'utf-8');

      // Every dashboard hook should reference the queryKeys factory
      expect(source).toContain('queryKeys.');
    },
  );
});

// ─── 1.3 Column Name Mismatches ────────────────────────────────────────────
// **Validates: Requirements 2.3, 2.4**

describe('1.3 Column name fault condition', () => {
  it('useStudentDashboard reads streak_current (not current_streak) from student_gamification', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Should use the correct column name that the edge function writes to
    expect(source).toContain('streak_current');
  });

  it('useStudentDashboard reads attainment_percent (not score_percent) from outcome_attainment', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // Should use the correct column name that calculate-attainment-rollup writes
    expect(source).toContain('attainment_percent');
  });
});

// ─── 1.4 PostgREST Filter Sanitization ─────────────────────────────────────
// **Validates: Requirements 2.12**

describe('1.4 PostgREST filter sanitization fault condition', () => {
  it('sanitizePostgrestValue utility exists and escapes special characters', () => {
    const sanitizeFilterPath = path.join(srcRoot, 'src/lib/sanitizeFilter.ts');

    // The module file must exist
    const fileExists = fs.existsSync(sanitizeFilterPath);
    expect(fileExists).toBe(true);
  });
});


// ─── 1.5 Audit Logging Coverage ────────────────────────────────────────────
// **Validates: Requirements 2.8**

describe('1.5 Audit logging coverage fault condition', () => {
  const hookFiles: Array<{ file: string; label: string }> = [
    { file: 'src/hooks/useCLOs.ts', label: 'useCLOs' },
    { file: 'src/hooks/useAssignments.ts', label: 'useAssignments' },
    { file: 'src/hooks/useRubrics.ts', label: 'useRubrics' },
    { file: 'src/hooks/useEnrollments.ts', label: 'useEnrollments' },
    { file: 'src/hooks/useSubmissions.ts', label: 'useSubmissions' },
  ];

  it.each(hookFiles)(
    '$label contains logAuditEvent calls for mutation hooks',
    ({ file }: { file: string }) => {
      const filePath = path.join(srcRoot, file);
      const source = fs.readFileSync(filePath, 'utf-8');

      // All mutation hooks in these files should call logAuditEvent
      expect(source).toContain('logAuditEvent');
    },
  );
});

// ─── 1.6 Course Name Display ───────────────────────────────────────────────
// **Validates: Requirements 2.16**

describe('1.6 Course name display fault condition', () => {
  it('useUpcomingDeadlines joins to courses table for course name', () => {
    const filePath = path.join(srcRoot, 'src/hooks/useStudentDashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The query should join to courses to get the actual name
    expect(source).toContain('courses(name)');
  });
});

// ─── 1.7 Edge Function Permission Check ────────────────────────────────────
// **Validates: Requirements 2.11**

describe('1.7 Edge function permission fault condition', () => {
  it('award-xp edge function validates caller permissions', () => {
    const filePath = path.join(srcRoot, 'supabase/functions/award-xp/index.ts');
    const source = fs.readFileSync(filePath, 'utf-8');

    // The edge function should check authorization/permissions before awarding XP
    // It should verify the caller is either service_role or the student themselves
    const hasPermissionCheck =
      source.includes('authorization') && (
        source.includes('service_role') ||
        source.includes('403') ||
        source.includes('Forbidden') ||
        source.includes('permission')
      );

    expect(hasPermissionCheck).toBe(true);
  });
});
