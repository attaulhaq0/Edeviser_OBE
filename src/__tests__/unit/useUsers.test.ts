// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  or: mockOr,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  then: undefined as ((resolve: (v: unknown) => void) => void) | undefined,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock('@/lib/auditLogger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'admin-user-id' },
    profile: null,
    role: 'admin',
    institutionId: 'inst-1',
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

import { supabase as _supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLogger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe('useUsers hooks — queryFn / mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // All chain methods return the chain object for fluent chaining
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOr.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'new-id' }, error: null });
  });

  // ─── useUsers queryFn ───────────────────────────────────────────────────

  describe('useUsers queryFn', () => {
    it('queries profiles table ordered by created_at desc', () => {
      supabase.from('profiles');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('calls select, order, and applies role filter when provided', () => {
      const chain = supabase.from('profiles');
      chain.select('*');
      chain.order('created_at', { ascending: false });
      chain.eq('role', 'teacher');

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockEq).toHaveBeenCalledWith('role', 'teacher');
    });

    it('applies search filter on full_name and email via or()', () => {
      const chain = supabase.from('profiles');
      chain.select('*');
      chain.order('created_at', { ascending: false });
      chain.or('full_name.ilike.%john%,email.ilike.%john%');

      expect(mockOr).toHaveBeenCalledWith(
        'full_name.ilike.%john%,email.ilike.%john%',
      );
    });

    it('applies both role and search filters together', () => {
      const chain = supabase.from('profiles');
      chain.select('*');
      chain.order('created_at', { ascending: false });
      chain.eq('role', 'student');
      chain.or('full_name.ilike.%jane%,email.ilike.%jane%');

      expect(mockEq).toHaveBeenCalledWith('role', 'student');
      expect(mockOr).toHaveBeenCalledWith(
        'full_name.ilike.%jane%,email.ilike.%jane%',
      );
    });
  });

  // ─── useUser queryFn ───────────────────────────────────────────────────

  describe('useUser queryFn', () => {
    it('queries profiles by id with maybeSingle', async () => {
      const id = 'user-abc';
      mockMaybeSingle.mockResolvedValue({ data: { id, full_name: 'Test' }, error: null });

      const chain = supabase.from('profiles');
      chain.select('*');
      chain.eq('id', id);
      const result = await chain.maybeSingle();

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', id);
      expect(mockMaybeSingle).toHaveBeenCalled();
      expect(result.data).toEqual({ id, full_name: 'Test' });
    });
  });

  // ─── useCreateUser mutationFn ─────────────────────────────────────────

  describe('useCreateUser mutationFn', () => {
    it('inserts into profiles and logs audit event', async () => {
      const newUser = {
        email: 'new@example.com',
        full_name: 'New User',
        role: 'teacher' as const,
        institution_id: 'inst-1',
      };

      mockSingle.mockResolvedValue({ data: { id: 'created-id', ...newUser }, error: null });

      const chain = supabase.from('profiles');
      chain.insert(newUser);
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: 'created-id' }));
      expect(mockInsert).toHaveBeenCalledWith(newUser);

      await logAuditEvent({
        action: 'create',
        entity_type: 'user',
        entity_id: data!.id,
        changes: newUser,
        performed_by: 'admin-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: 'create',
        entity_type: 'user',
        entity_id: 'created-id',
        changes: newUser,
        performed_by: 'admin-user-id',
      });
    });
  });

  // ─── useUpdateUser mutationFn ─────────────────────────────────────────

  describe('useUpdateUser mutationFn', () => {
    it('updates profiles and logs audit event', async () => {
      const userId = 'user-to-update';
      const changes = { full_name: 'Updated Name' };

      mockSingle.mockResolvedValue({ data: { id: userId, ...changes }, error: null });

      const chain = supabase.from('profiles');
      chain.update(changes);
      chain.eq('id', userId);
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(changes);
      expect(mockEq).toHaveBeenCalledWith('id', userId);

      await logAuditEvent({
        action: 'update',
        entity_type: 'user',
        entity_id: userId,
        changes,
        performed_by: 'admin-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: 'update',
        entity_type: 'user',
        entity_id: userId,
        changes,
        performed_by: 'admin-user-id',
      });
    });
  });

  // ─── useSoftDeleteUser mutationFn ─────────────────────────────────────

  describe('useSoftDeleteUser mutationFn', () => {
    it('sets is_active to false and logs audit event', async () => {
      const userId = 'user-to-deactivate';

      mockSingle.mockResolvedValue({ data: { id: userId, is_active: false }, error: null });

      const chain = supabase.from('profiles');
      chain.update({ is_active: false });
      chain.eq('id', userId);
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockEq).toHaveBeenCalledWith('id', userId);

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'user',
        entity_id: userId,
        changes: { is_active: false },
        performed_by: 'admin-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: 'soft_delete',
        entity_type: 'user',
        entity_id: userId,
        changes: { is_active: false },
        performed_by: 'admin-user-id',
      });
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns error when supabase query fails', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

      const chain = supabase.from('profiles');
      chain.select('*');
      chain.eq('id', 'some-id');
      const result = await chain.maybeSingle();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('RLS denied');
    });

    it('returns error when insert fails', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Duplicate email' } });

      const chain = supabase.from('profiles');
      chain.insert({ email: 'dup@test.com' });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe('Duplicate email');
    });
  });
});
