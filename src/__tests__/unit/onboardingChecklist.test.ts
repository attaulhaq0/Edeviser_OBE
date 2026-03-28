import { describe, it, expect } from 'vitest';
import { getChecklistForRole } from '@/lib/onboardingChecklist';
import type { UserRole } from '@/types/app';

describe('getChecklistForRole', () => {
  it('returns admin checklist items', () => {
    const items = getChecklistForRole('admin');
    expect(items).toHaveLength(4);
    const first = items[0] as { id: string; route: string };
    expect(first.id).toBe('create-ilo');
    expect(first.route).toBe('/admin/outcomes');
  });

  it('returns coordinator checklist items', () => {
    const items = getChecklistForRole('coordinator');
    expect(items).toHaveLength(3);
    const first = items[0] as { id: string };
    expect(first.id).toBe('create-plo');
  });

  it('returns teacher checklist items', () => {
    const items = getChecklistForRole('teacher');
    expect(items).toHaveLength(4);
    const first = items[0] as { id: string };
    expect(first.id).toBe('create-clo');
  });

  it('returns student checklist items', () => {
    const items = getChecklistForRole('student');
    expect(items).toHaveLength(4);
    const first = items[0] as { id: string };
    expect(first.id).toBe('view-progress');
  });

  it('returns empty array for parent role', () => {
    const items = getChecklistForRole('parent');
    expect(items).toEqual([]);
  });

  it('all items have required fields', () => {
    const roles: UserRole[] = ['admin', 'coordinator', 'teacher', 'student'];
    for (const role of roles) {
      const items = getChecklistForRole(role);
      for (const item of items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.route).toMatch(/^\//);
      }
    }
  });
});
