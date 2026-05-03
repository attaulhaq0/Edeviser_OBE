// Feature: xp-marketplace, Property 13: Deadline extension adds exactly 24h
// Feature: xp-marketplace, Property 14: Revocation restores original deadline
// Feature: xp-marketplace, Property 15: One extension per assignment
// **Validates: Requirements 9.1, 9.4, 9.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions under test ──────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface DeadlineExtension {
  student_id: string;
  assignment_id: string;
  original_deadline: string;
  extended_deadline: string;
  revoked: boolean;
  purchase_status: 'active' | 'refunded';
}

function computeExtendedDeadline(originalDeadline: string): string {
  const original = new Date(originalDeadline);
  return new Date(original.getTime() + TWENTY_FOUR_HOURS_MS).toISOString();
}

function revokeExtension(ext: DeadlineExtension): DeadlineExtension {
  return {
    ...ext,
    revoked: true,
    purchase_status: 'refunded',
  };
}

function getEffectiveDeadline(ext: DeadlineExtension): string {
  return ext.revoked ? ext.original_deadline : ext.extended_deadline;
}

function canActivateExtension(
  existingExtensions: DeadlineExtension[],
  studentId: string,
  assignmentId: string,
): boolean {
  return !existingExtensions.some(
    (e) => e.student_id === studentId && e.assignment_id === assignmentId && !e.revoked,
  );
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const deadlineDateArb = fc
  .integer({ min: new Date('2024-06-01').getTime(), max: new Date('2025-12-31').getTime() })
  .map((ts) => new Date(ts).toISOString());

// ─── P13: Extension adds exactly 24h ────────────────────────────────────────

describe('Property 13 — Deadline extension adds exactly 24 hours', () => {
  it('P13: extended deadline is exactly original + 24 hours', () => {
    fc.assert(
      fc.property(deadlineDateArb, (originalDeadline) => {
        const extended = computeExtendedDeadline(originalDeadline);
        const diff = new Date(extended).getTime() - new Date(originalDeadline).getTime();
        expect(diff).toBe(TWENTY_FOUR_HOURS_MS);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P14: Revocation restores original deadline ─────────────────────────────

describe('Property 14 — Revocation restores original deadline and refunds token', () => {
  it('P14: after revocation, effective deadline equals original and purchase is refunded', () => {
    fc.assert(
      fc.property(deadlineDateArb, fc.uuid(), fc.uuid(), (originalDeadline, studentId, assignmentId) => {
        const ext: DeadlineExtension = {
          student_id: studentId,
          assignment_id: assignmentId,
          original_deadline: originalDeadline,
          extended_deadline: computeExtendedDeadline(originalDeadline),
          revoked: false,
          purchase_status: 'active',
        };

        // Before revocation, effective deadline is extended
        expect(getEffectiveDeadline(ext)).toBe(ext.extended_deadline);

        // After revocation
        const revoked = revokeExtension(ext);
        expect(revoked.revoked).toBe(true);
        expect(revoked.purchase_status).toBe('refunded');
        expect(getEffectiveDeadline(revoked)).toBe(originalDeadline);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P15: One extension per assignment ──────────────────────────────────────

describe('Property 15 — One extension per student per assignment', () => {
  it('P15: cannot activate a second extension on the same assignment', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), deadlineDateArb, (studentId, assignmentId, deadline) => {
        const existing: DeadlineExtension[] = [
          {
            student_id: studentId,
            assignment_id: assignmentId,
            original_deadline: deadline,
            extended_deadline: computeExtendedDeadline(deadline),
            revoked: false,
            purchase_status: 'active',
          },
        ];

        // Cannot activate another extension for same student + assignment
        expect(canActivateExtension(existing, studentId, assignmentId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P15b: can activate extension if previous was revoked', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), deadlineDateArb, (studentId, assignmentId, deadline) => {
        const existing: DeadlineExtension[] = [
          {
            student_id: studentId,
            assignment_id: assignmentId,
            original_deadline: deadline,
            extended_deadline: computeExtendedDeadline(deadline),
            revoked: true,
            purchase_status: 'refunded',
          },
        ];

        // Can activate because previous was revoked
        expect(canActivateExtension(existing, studentId, assignmentId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
