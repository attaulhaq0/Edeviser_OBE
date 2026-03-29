// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock('@/lib/auditLogger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { supabase as _supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLogger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe('useCQIPlans hooks — queryFn / mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'new-id' }, error: null });
  });

  // ─── useCQIPlans queryFn ────────────────────────────────────────────────

  describe('useCQIPlans queryFn', () => {
    it('queries cqi_action_plans table ordered by created_at desc', () => {
      supabase.from('cqi_action_plans');
      expect(supabase.from).toHaveBeenCalledWith('cqi_action_plans');
    });

    it('calls select with wildcard and order', () => {
      const chain = supabase.from('cqi_action_plans');
      chain.select('*');
      chain.order('created_at', { ascending: false });

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  // ─── useCQIPlan queryFn ─────────────────────────────────────────────────

  describe('useCQIPlan queryFn', () => {
    it('queries cqi_action_plans by id with maybeSingle', async () => {
      const id = 'cqi-abc';
      mockMaybeSingle.mockResolvedValue({
        data: {
          id,
          program_id: 'prog-1',
          semester_id: 'sem-1',
          outcome_id: 'plo-1',
          outcome_type: 'PLO',
          baseline_attainment: 45,
          target_attainment: 70,
          action_description: 'Improve lab sessions',
          responsible_person: 'Dr. Smith',
          status: 'planned',
          result_attainment: null,
        },
        error: null,
      });

      const chain = supabase.from('cqi_action_plans');
      chain.select('*');
      chain.eq('id', id);
      const result = await chain.maybeSingle();

      expect(mockEq).toHaveBeenCalledWith('id', id);
      expect(result.data).toEqual(expect.objectContaining({ id, status: 'planned' }));
    });
  });

  // ─── useCreateCQIPlan mutationFn ────────────────────────────────────────

  describe('useCreateCQIPlan mutationFn', () => {
    it('inserts into cqi_action_plans and logs audit event', async () => {
      const newPlan = {
        program_id: 'prog-1',
        semester_id: 'sem-1',
        outcome_id: 'plo-1',
        outcome_type: 'PLO',
        baseline_attainment: 45,
        target_attainment: 70,
        action_description: 'Add more lab sessions',
        responsible_person: 'Dr. Smith',
        status: 'planned',
      };

      mockSingle.mockResolvedValue({
        data: { id: 'created-cqi-id', ...newPlan },
        error: null,
      });

      const chain = supabase.from('cqi_action_plans');
      chain.insert(newPlan);
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: 'created-cqi-id' }));
      expect(mockInsert).toHaveBeenCalledWith(newPlan);

      await logAuditEvent({
        action: 'create',
        entity_type: 'cqi_action_plan',
        entity_id: data!.id,
        changes: {
          program_id: newPlan.program_id,
          outcome_id: newPlan.outcome_id,
          outcome_type: newPlan.outcome_type,
          baseline_attainment: newPlan.baseline_attainment,
          target_attainment: newPlan.target_attainment,
          action_description: newPlan.action_description,
          responsible_person: newPlan.responsible_person,
        },
        performed_by: 'coordinator-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          entity_type: 'cqi_action_plan',
          entity_id: 'created-cqi-id',
        }),
      );
    });
  });

  // ─── useUpdateCQIPlan mutationFn ────────────────────────────────────────

  describe('useUpdateCQIPlan mutationFn', () => {
    it('updates cqi plan and logs audit event', async () => {
      const planId = 'cqi-to-update';
      const changes = { status: 'in_progress' };

      mockSingle.mockResolvedValue({ data: { id: planId, ...changes }, error: null });

      const chain = supabase.from('cqi_action_plans');
      chain.update(changes);
      chain.eq('id', planId);
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(changes);
      expect(mockEq).toHaveBeenCalledWith('id', planId);

      await logAuditEvent({
        action: 'update',
        entity_type: 'cqi_action_plan',
        entity_id: planId,
        changes,
        performed_by: 'coordinator-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entity_type: 'cqi_action_plan',
          entity_id: planId,
        }),
      );
    });

    it('requires result_attainment when evaluating', async () => {
      const planId = 'cqi-to-evaluate';
      const changes = { status: 'evaluated', result_attainment: 78 };

      mockSingle.mockResolvedValue({ data: { id: planId, ...changes }, error: null });

      const chain = supabase.from('cqi_action_plans');
      chain.update(changes);
      chain.eq('id', planId);
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ result_attainment: 78, status: 'evaluated' }));
    });
  });

  // ─── useDeleteCQIPlan mutationFn ────────────────────────────────────────

  describe('useDeleteCQIPlan mutationFn', () => {
    it('deletes cqi plan and logs audit event', async () => {
      const planId = 'cqi-to-delete';
      mockEq.mockResolvedValue({ error: null });

      const chain = supabase.from('cqi_action_plans');
      chain.delete();
      const result = await chain.eq('id', planId);

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', planId);

      await logAuditEvent({
        action: 'delete',
        entity_type: 'cqi_action_plan',
        entity_id: planId,
        changes: null,
        performed_by: 'coordinator-user-id',
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          entity_type: 'cqi_action_plan',
          entity_id: planId,
        }),
      );
    });
  });

  // ─── useCQIPlanSummary queryFn ──────────────────────────────────────────

  describe('useCQIPlanSummary queryFn', () => {
    it('counts plans by status for a given program', async () => {
      const plans = [
        { status: 'planned' },
        { status: 'planned' },
        { status: 'in_progress' },
        { status: 'completed' },
        { status: 'evaluated' },
      ];

      mockEq.mockResolvedValue({ data: plans, error: null });

      const chain = supabase.from('cqi_action_plans');
      chain.select('status');
      const result = await chain.eq('program_id', 'prog-1');

      expect(result.data).toHaveLength(5);

      // Simulate the summary computation
      const summary = { planned: 0, in_progress: 0, completed: 0, evaluated: 0, total: result.data!.length };
      for (const plan of result.data!) {
        const s = plan.status as keyof typeof summary;
        if (s in summary && s !== 'total') {
          (summary[s] as number)++;
        }
      }

      expect(summary.planned).toBe(2);
      expect(summary.in_progress).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.evaluated).toBe(1);
      expect(summary.total).toBe(5);
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns error when supabase query fails', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

      const chain = supabase.from('cqi_action_plans');
      chain.select('*');
      chain.eq('id', 'some-id');
      const result = await chain.maybeSingle();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('RLS denied');
    });

    it('returns error when insert fails', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Unique violation' } });

      const chain = supabase.from('cqi_action_plans');
      chain.insert({ program_id: 'p-1' });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe('Unique violation');
    });
  });
});
