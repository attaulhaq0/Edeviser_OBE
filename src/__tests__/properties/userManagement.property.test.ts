// Feature: edeviser-platform, Property 9: User CRUD within institution
// Feature: edeviser-platform, Property 10: Soft-delete preserves historical data
// Feature: edeviser-platform, Property 11: Role change logged to audit
// Feature: edeviser-platform, Property 12: Admin cannot delete own account
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { UserRole } from '@/types/app';

// ─── Pure user management model ─────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id: string;
  is_active: boolean;
}

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown>;
  performed_by: string;
}

interface UserCreateInput {
  email: string;
  full_name: string;
  role: UserRole;
  institution_id: string;
}

function createUser(input: UserCreateInput, performedBy: string): { user: UserRecord; audit: AuditLogEntry } {
  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    institution_id: input.institution_id,
    is_active: true,
  };
  const audit: AuditLogEntry = {
    action: 'create',
    entity_type: 'user',
    entity_id: user.id,
    changes: { ...input },
    performed_by: performedBy,
  };
  return { user, audit };
}

function softDeleteUser(
  user: UserRecord,
  performedBy: string,
): { user: UserRecord; audit: AuditLogEntry } | { error: string } {
  if (user.id === performedBy) {
    return { error: 'Cannot delete own admin account' };
  }
  return {
    user: { ...user, is_active: false },
    audit: {
      action: 'soft_delete',
      entity_type: 'user',
      entity_id: user.id,
      changes: { is_active: { before: true, after: false } },
      performed_by: performedBy,
    },
  };
}

function changeRole(
  user: UserRecord,
  newRole: UserRole,
  performedBy: string,
): { user: UserRecord; audit: AuditLogEntry } {
  const oldRole = user.role;
  return {
    user: { ...user, role: newRole },
    audit: {
      action: 'update_role',
      entity_type: 'user',
      entity_id: user.id,
      changes: { role: { before: oldRole, after: newRole } },
      performed_by: performedBy,
    },
  };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.constantFrom('example.com', 'university.edu'),
  )
  .map(([local, domain]) => `${local}@${domain}`);

const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,10} [A-Z][a-z]{2,10}$/);
const roleArb = fc.constantFrom<UserRole>('admin', 'coordinator', 'teacher', 'student');
const institutionIdArb = fc.uuid();
const userIdArb = fc.uuid();

// ─── Property 9: User CRUD within institution ───────────────────────────────

describe('Property 9 — User CRUD within institution', () => {
  it('P9a: created user has correct fields and is_active = true', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, roleArb, institutionIdArb, userIdArb,
        (email, name, role, instId, adminId) => {
          const { user } = createUser(
            { email, full_name: name, role, institution_id: instId },
            adminId,
          );
          expect(user.email).toBe(email);
          expect(user.full_name).toBe(name);
          expect(user.role).toBe(role);
          expect(user.institution_id).toBe(instId);
          expect(user.is_active).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P9b: user creation generates an audit log entry', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, roleArb, institutionIdArb, userIdArb,
        (email, name, role, instId, adminId) => {
          const { audit } = createUser(
            { email, full_name: name, role, institution_id: instId },
            adminId,
          );
          expect(audit.action).toBe('create');
          expect(audit.entity_type).toBe('user');
          expect(audit.performed_by).toBe(adminId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Soft-delete preserves historical data ─────────────────────

describe('Property 10 — Soft-delete preserves historical data', () => {
  it('P10a: soft-delete sets is_active to false, preserves all other fields', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, roleArb, institutionIdArb, userIdArb, userIdArb,
        (email, name, role, instId, userId, adminId) => {
          fc.pre(userId !== adminId);
          const original: UserRecord = {
            id: userId, email, full_name: name, role, institution_id: instId, is_active: true,
          };
          const result = softDeleteUser(original, adminId);
          expect('user' in result).toBe(true);
          if ('user' in result) {
            expect(result.user.is_active).toBe(false);
            expect(result.user.id).toBe(original.id);
            expect(result.user.email).toBe(original.email);
            expect(result.user.full_name).toBe(original.full_name);
            expect(result.user.role).toBe(original.role);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Role change logged to audit ───────────────────────────────

describe('Property 11 — Role change audit logging', () => {
  it('P11a: role change produces audit entry with before/after values', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, roleArb, roleArb, institutionIdArb, userIdArb, userIdArb,
        (email, name, oldRole, newRole, instId, userId, adminId) => {
          const user: UserRecord = {
            id: userId, email, full_name: name, role: oldRole, institution_id: instId, is_active: true,
          };
          const { audit } = changeRole(user, newRole, adminId);
          expect(audit.action).toBe('update_role');
          expect(audit.changes.role).toEqual({ before: oldRole, after: newRole });
          expect(audit.performed_by).toBe(adminId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Admin cannot delete own account ───────────────────────────

describe('Property 12 — Admin cannot delete own account', () => {
  it('P12a: self-deletion is rejected', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, institutionIdArb, userIdArb,
        (email, name, instId, adminId) => {
          const user: UserRecord = {
            id: adminId, email, full_name: name, role: 'admin', institution_id: instId, is_active: true,
          };
          const result = softDeleteUser(user, adminId);
          expect('error' in result).toBe(true);
          if ('error' in result) {
            expect(result.error).toContain('Cannot delete own');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P12b: deleting a different user succeeds', () => {
    fc.assert(
      fc.property(
        emailArb, nameArb, institutionIdArb, userIdArb, userIdArb,
        (email, name, instId, userId, adminId) => {
          fc.pre(userId !== adminId);
          const user: UserRecord = {
            id: userId, email, full_name: name, role: 'teacher', institution_id: instId, is_active: true,
          };
          const result = softDeleteUser(user, adminId);
          expect('user' in result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
