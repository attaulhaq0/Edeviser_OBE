// Feature: edeviser-platform, Property 13: Bulk import CSV validation
// Feature: edeviser-platform, Property 14: Bulk import atomicity
// **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { UserRole as _UserRole } from '@/types/app';

// ─── Pure bulk import model ─────────────────────────────────────────────────

interface CSVRow {
  email: string;
  full_name: string;
  role: string;
  program_id: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkImportResult {
  valid_rows: CSVRow[];
  errors: ValidationError[];
  rejected: boolean;
  rejection_reason?: string;
}

const VALID_ROLES: string[] = ['admin', 'coordinator', 'teacher', 'student'];
const MAX_BATCH_SIZE = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCSVRow(row: CSVRow, rowIndex: number, existingProgramIds: string[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.email || !EMAIL_REGEX.test(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
  }
  if (!row.full_name || row.full_name.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'full_name', message: 'Full name is required' });
  }
  if (!VALID_ROLES.includes(row.role)) {
    errors.push({ row: rowIndex, field: 'role', message: `Invalid role: ${row.role}` });
  }
  if (row.program_id && !existingProgramIds.includes(row.program_id)) {
    errors.push({ row: rowIndex, field: 'program_id', message: 'Non-existent program_id' });
  }

  return errors;
}

function processBulkImport(rows: CSVRow[], existingProgramIds: string[]): BulkImportResult {
  if (rows.length > MAX_BATCH_SIZE) {
    return {
      valid_rows: [],
      errors: [],
      rejected: true,
      rejection_reason: `Exceeds maximum batch size of ${MAX_BATCH_SIZE}`,
    };
  }

  const allErrors: ValidationError[] = [];
  const validRows: CSVRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowErrors = validateCSVRow(rows[i]!, i + 1, existingProgramIds);
    if (rowErrors.length === 0) {
      validRows.push(rows[i]!);
    } else {
      allErrors.push(...rowErrors);
    }
  }

  return { valid_rows: validRows, errors: allErrors, rejected: false };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const validEmailArb = fc
  .tuple(fc.stringMatching(/^[a-z]{3,8}$/), fc.constantFrom('test.com', 'uni.edu'))
  .map(([local, domain]) => `${local}@${domain}`);

const invalidEmailArb = fc.constantFrom('', 'noatsign', '@missing', 'spaces in@email.com');

const validNameArb = fc.stringMatching(/^[A-Z][a-z]{2,8} [A-Z][a-z]{2,8}$/);
const validRoleArb = fc.constantFrom('admin', 'coordinator', 'teacher', 'student');
const invalidRoleArb = fc.constantFrom('superadmin', 'moderator', '', 'ADMIN');
const programIdArb = fc.uuid();

const validRowArb = (programIds: string[]) =>
  fc.record({
    email: validEmailArb,
    full_name: validNameArb,
    role: validRoleArb,
    program_id: programIds.length > 0
      ? fc.constantFrom(...programIds)
      : fc.constant(''),
  });

// ─── Property 13: CSV validation ────────────────────────────────────────────

describe('Property 13 — Bulk import CSV validation', () => {
  it('P13a: valid rows pass validation with zero errors', () => {
    fc.assert(
      fc.property(
        fc.array(programIdArb, { minLength: 1, maxLength: 3 }),
        (programIds) => {
          return fc.assert(
            fc.property(
              fc.array(validRowArb(programIds), { minLength: 1, maxLength: 10 }),
              (rows) => {
                const result = processBulkImport(rows, programIds);
                expect(result.rejected).toBe(false);
                expect(result.errors).toHaveLength(0);
                expect(result.valid_rows).toHaveLength(rows.length);
              },
            ),
            { numRuns: 20 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('P13b: invalid email produces validation error', () => {
    fc.assert(
      fc.property(invalidEmailArb, validNameArb, validRoleArb, (email, name, role) => {
        const rows: CSVRow[] = [{ email, full_name: name, role, program_id: '' }];
        const result = processBulkImport(rows, []);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.field === 'email')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P13c: invalid role produces validation error', () => {
    fc.assert(
      fc.property(validEmailArb, validNameArb, invalidRoleArb, (email, name, role) => {
        const rows: CSVRow[] = [{ email, full_name: name, role, program_id: '' }];
        const result = processBulkImport(rows, []);
        expect(result.errors.some((e) => e.field === 'role')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P13d: non-existent program_id produces validation error', () => {
    fc.assert(
      fc.property(validEmailArb, validNameArb, validRoleArb, programIdArb, (email, name, role, badProgramId) => {
        const rows: CSVRow[] = [{ email, full_name: name, role, program_id: badProgramId }];
        const result = processBulkImport(rows, []); // empty existing programs
        expect(result.errors.some((e) => e.field === 'program_id')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 14: Bulk import atomicity & batch size ────────────────────────

describe('Property 14 — Bulk import atomicity', () => {
  it('P14a: CSV exceeding 1000 rows is rejected entirely', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1001, max: 1500 }),
        (rowCount) => {
          const rows: CSVRow[] = Array.from({ length: rowCount }, (_, i) => ({
            email: `user${i}@test.com`,
            full_name: `User ${i}`,
            role: 'student',
            program_id: '',
          }));
          const result = processBulkImport(rows, []);
          expect(result.rejected).toBe(true);
          expect(result.rejection_reason).toContain('1000');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14b: CSV within 1000 rows is not rejected for size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (rowCount) => {
          const rows: CSVRow[] = Array.from({ length: rowCount }, (_, i) => ({
            email: `user${i}@test.com`,
            full_name: `User ${i}`,
            role: 'student',
            program_id: '',
          }));
          const result = processBulkImport(rows, []);
          expect(result.rejected).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14c: valid + invalid rows → only valid rows in result, errors list invalid rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (validCount, invalidCount) => {
          const rows: CSVRow[] = [
            ...Array.from({ length: validCount }, (_, i) => ({
              email: `valid${i}@test.com`,
              full_name: `Valid User ${i}`,
              role: 'student',
              program_id: '',
            })),
            ...Array.from({ length: invalidCount }, (_, i) => ({
              email: '', // invalid
              full_name: `Invalid User ${i}`,
              role: 'student',
              program_id: '',
            })),
          ];
          const result = processBulkImport(rows, []);
          expect(result.valid_rows).toHaveLength(validCount);
          expect(result.errors.length).toBeGreaterThanOrEqual(invalidCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
