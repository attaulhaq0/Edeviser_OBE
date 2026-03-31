// Feature: edeviser-platform, Property 18: Audit log immutability
// **Validates: Requirements 34**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure audit log model ───────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Models the immutability constraint on audit_logs.
 * Only INSERT is allowed; UPDATE and DELETE are denied.
 */
function evaluateAuditOperation(operation: AuditOperation): { allowed: boolean; reason?: string } {
  if (operation === 'INSERT') {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `${operation} operations are not permitted on audit_logs (append-only)`,
  };
}

/**
 * Validates that an audit log entry has all required fields.
 */
function validateAuditEntry(entry: Partial<AuditLogEntry>): { valid: boolean; missingFields: string[] } {
  const required: (keyof AuditLogEntry)[] = ['action', 'entity_type', 'entity_id', 'performed_by'];
  const missing = required.filter((field) => !entry[field]);
  return { valid: missing.length === 0, missingFields: missing };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const auditEntryArb = fc.record({
  id: fc.uuid(),
  action: fc.constantFrom('create', 'update', 'delete', 'soft_delete', 'update_role', 'bulk_import'),
  entity_type: fc.constantFrom('user', 'program', 'course', 'ilo', 'plo', 'clo', 'rubric', 'assignment'),
  entity_id: fc.uuid(),
  changes: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    { minKeys: 0, maxKeys: 5 },
  ),
  performed_by: fc.uuid(),
  created_at: fc.integer({ min: 0, max: 1095 }).map(
    (offset) => new Date(Date.UTC(2024, 0, 1 + offset)).toISOString(),
  ),
});

const operationArb = fc.constantFrom<AuditOperation>('INSERT', 'UPDATE', 'DELETE');

// ─── Property 18: Audit log immutability ────────────────────────────────────

describe('Property 18 — Audit log immutability', () => {
  it('P18a: INSERT operations are always allowed', () => {
    fc.assert(
      fc.property(auditEntryArb, (_entry) => {
        const result = evaluateAuditOperation('INSERT');
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P18b: UPDATE operations are always denied', () => {
    fc.assert(
      fc.property(auditEntryArb, (_entry) => {
        const result = evaluateAuditOperation('UPDATE');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('UPDATE');
        expect(result.reason).toContain('append-only');
      }),
      { numRuns: 100 },
    );
  });

  it('P18c: DELETE operations are always denied', () => {
    fc.assert(
      fc.property(auditEntryArb, (_entry) => {
        const result = evaluateAuditOperation('DELETE');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('DELETE');
      }),
      { numRuns: 100 },
    );
  });

  it('P18d: only INSERT is allowed among all operations', () => {
    fc.assert(
      fc.property(operationArb, (operation) => {
        const result = evaluateAuditOperation(operation);
        if (operation === 'INSERT') {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P18e: audit entries require all mandatory fields', () => {
    fc.assert(
      fc.property(auditEntryArb, (entry) => {
        const result = validateAuditEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P18f: partial audit entries are flagged as invalid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<(keyof AuditLogEntry)[]>(
          ['action'],
          ['entity_type'],
          ['entity_id'],
          ['performed_by'],
        ),
        (presentFields) => {
          const partial: Partial<AuditLogEntry> = {};
          for (const field of presentFields) {
            (partial as Record<string, unknown>)[field] = 'test-value';
          }
          const result = validateAuditEntry(partial);
          // With only 1 of 4 required fields, should be invalid
          expect(result.valid).toBe(false);
          expect(result.missingFields.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
