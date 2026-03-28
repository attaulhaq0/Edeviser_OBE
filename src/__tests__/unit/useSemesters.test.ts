import { describe, it, expect, vi } from 'vitest';

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

const chainable = () => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  order: mockOrder,
  eq: mockEq,
  neq: mockNeq,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainable()),
  },
}));

vi.mock('@/lib/auditLogger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, institutionId: 'inst-1' }),
}));

import type { CreateSemesterInput, UpdateSemesterInput } from '@/hooks/useSemesters';

describe('useSemesters types', () => {
  it('CreateSemesterInput has required fields', () => {
    const input: CreateSemesterInput = {
      name: 'Fall 2025',
      code: 'F25',
      start_date: '2025-09-01',
      end_date: '2025-12-31',
      is_active: true,
      institution_id: 'inst-1',
    };
    expect(input.name).toBe('Fall 2025');
    expect(input.code).toBe('F25');
    expect(input.start_date).toBe('2025-09-01');
    expect(input.end_date).toBe('2025-12-31');
    expect(input.is_active).toBe(true);
    expect(input.institution_id).toBe('inst-1');
  });

  it('UpdateSemesterInput allows partial fields', () => {
    const input: UpdateSemesterInput = {
      name: 'Spring 2026',
    };
    expect(input.name).toBe('Spring 2026');
    expect(input.is_active).toBeUndefined();
  });

  it('UpdateSemesterInput allows is_active toggle', () => {
    const input: UpdateSemesterInput = {
      is_active: false,
    };
    expect(input.is_active).toBe(false);
  });
});
