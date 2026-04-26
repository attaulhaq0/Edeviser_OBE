// Feature: xp-marketplace, Property 13: deadline extension adds exactly 24 hours
// Feature: xp-marketplace, Property 14: revocation restores original deadline
// Feature: xp-marketplace, Property 15: max one extension per assignment
// **Validates: Requirements 9.1, 9.4, 9.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain helpers ─────────────────────────────────────────────────────────

const EXTENSION_HOURS = 24;
const MS_PER_HOUR = 3600_000;

interface DeadlineExtension {
  studentId: string;
  assignmentId: string;
  originalDeadline: Date;
  extendedDeadline: Date;
  revoked: boolean;
}

/**
 * Pure function: compute extended deadline (original + 24 hours).
 */
const computeExtendedDeadline = (originalDeadline: Date): Date => {
  return new Date(originalDeadline.getTime() + EXTENSION_HOURS * MS_PER_HOUR);
};

/**
 * Pure function: get effective deadline considering extension and revocation.
 */
const getEffectiveDeadline = (
  originalDeadline: Date,
  extension: DeadlineExtension | null,
): Date => {
  if (!extension || extension.revoked) return originalDeadline;
  return extension.extendedDeadline;
};

/**
 * Pure function: check if a student can apply an extension to an assignment.
 */
const canApplyExtension = (
  existingExtensions: DeadlineExtension[],
  studentId: string,
  assignmentId: string,
): boolean => {
  return !existingExtensions.some(
    (ext) => ext.studentId === studentId && ext.assignmentId === assignmentId,
  );
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const deadlineDateArb = fc.date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2026-12-31T23:59:59Z'), noInvalidDate: true });

// ─── Property 13: 24h extension ─────────────────────────────────────────────

describe('Property 13 — Deadline extension adds exactly 24 hours', () => {
  it('P13a: extended deadline is exactly 24 hours after original', () => {
    fc.assert(
      fc.property(deadlineDateArb, (originalDeadline) => {
        const extended = computeExtendedDeadline(originalDeadline);
        const diffMs = extended.getTime() - originalDeadline.getTime();
        expect(diffMs).toBe(EXTENSION_HOURS * MS_PER_HOUR);
      }),
      { numRuns: 100 },
    );
  });

  it('P13b: extended deadline is always after original', () => {
    fc.assert(
      fc.property(deadlineDateArb, (originalDeadline) => {
        const extended = computeExtendedDeadline(originalDeadline);
        expect(extended.getTime()).toBeGreaterThan(originalDeadline.getTime());
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 14: revocation restores original deadline ─────────────────────

describe('Property 14 — Revocation restores original deadline', () => {
  it('P14a: revoked extension returns original deadline', () => {
    fc.assert(
      fc.property(
        deadlineDateArb,
        fc.uuid(),
        fc.uuid(),
        (originalDeadline, studentId, assignmentId) => {
          const extension: DeadlineExtension = {
            studentId,
            assignmentId,
            originalDeadline,
            extendedDeadline: computeExtendedDeadline(originalDeadline),
            revoked: true,
          };

          const effective = getEffectiveDeadline(originalDeadline, extension);
          expect(effective.getTime()).toBe(originalDeadline.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14b: active extension returns extended deadline', () => {
    fc.assert(
      fc.property(
        deadlineDateArb,
        fc.uuid(),
        fc.uuid(),
        (originalDeadline, studentId, assignmentId) => {
          const extension: DeadlineExtension = {
            studentId,
            assignmentId,
            originalDeadline,
            extendedDeadline: computeExtendedDeadline(originalDeadline),
            revoked: false,
          };

          const effective = getEffectiveDeadline(originalDeadline, extension);
          expect(effective.getTime()).toBe(extension.extendedDeadline.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14c: no extension returns original deadline', () => {
    fc.assert(
      fc.property(deadlineDateArb, (originalDeadline) => {
        const effective = getEffectiveDeadline(originalDeadline, null);
        expect(effective.getTime()).toBe(originalDeadline.getTime());
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: one extension per assignment ──────────────────────────────

describe('Property 15 — Max one extension per assignment', () => {
  it('P15a: cannot apply extension when one already exists for same student+assignment', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        deadlineDateArb,
        (studentId, assignmentId, deadline) => {
          const existing: DeadlineExtension[] = [
            {
              studentId,
              assignmentId,
              originalDeadline: deadline,
              extendedDeadline: computeExtendedDeadline(deadline),
              revoked: false,
            },
          ];

          expect(canApplyExtension(existing, studentId, assignmentId)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15b: can apply extension when no existing extension for this student+assignment', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        deadlineDateArb,
        (studentId, assignmentId, otherStudentId, otherAssignmentId, deadline) => {
          // Extensions exist for other student/assignment combos
          const existing: DeadlineExtension[] = [
            {
              studentId: otherStudentId,
              assignmentId: otherAssignmentId,
              originalDeadline: deadline,
              extendedDeadline: computeExtendedDeadline(deadline),
              revoked: false,
            },
          ];

          // Different student+assignment combo should be allowed
          // (unless UUIDs happen to collide, which is astronomically unlikely)
          if (studentId !== otherStudentId || assignmentId !== otherAssignmentId) {
            expect(canApplyExtension(existing, studentId, assignmentId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
