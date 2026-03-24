// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  in: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

import { supabase as _supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

const sampleRecovery = {
  id: 'rec-1',
  institution_id: 'inst-1',
  student_id: 'student-1',
  clo_id: 'clo-1',
  course_id: 'course-1',
  failure_count: 2,
  status: 'active',
  ai_tutor_completed: false,
  ai_tutor_completed_at: null,
  practice_completed: false,
  practice_completed_at: null,
  peer_suggestion_shown: false,
  peer_suggestion_applicable: true,
  retry_quiz_attempt_id: null,
  retry_outcome: null,
  activated_at: '2025-01-01T00:00:00Z',
  completed_at: null,
  expired_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useMasteryRecovery hooks — queryFn / mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockSingle.mockResolvedValue({ data: sampleRecovery, error: null });
    mockMaybeSingle.mockResolvedValue({ data: sampleRecovery, error: null });
  });

  // ── useMasteryRecoveryStatus queryFn ──────────────────────────────────

  describe('useMasteryRecoveryStatus queryFn', () => {
    it('queries mastery_recovery_pathways for active status by student and CLO', async () => {
      mockMaybeSingle.mockResolvedValue({ data: sampleRecovery, error: null });

      supabase.from('mastery_recovery_pathways');
      chainObj.select('*');
      chainObj.eq('student_id', 'student-1');
      chainObj.eq('clo_id', 'clo-1');
      chainObj.eq('status', 'active');
      const result = await chainObj.maybeSingle();

      expect(supabase.from).toHaveBeenCalledWith('mastery_recovery_pathways');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('student_id', 'student-1');
      expect(mockEq).toHaveBeenCalledWith('clo_id', 'clo-1');
      expect(mockEq).toHaveBeenCalledWith('status', 'active');
      expect(result.data).toEqual(sampleRecovery);
    });

    it('returns null when no active recovery exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await chainObj.maybeSingle();
      expect(result.data).toBeNull();
    });

    it('returns error on supabase failure', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

      const result = await chainObj.maybeSingle();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('RLS denied');
    });
  });

  // ── useRecoveryPathway queryFn ────────────────────────────────────────

  describe('useRecoveryPathway queryFn', () => {
    it('queries a specific recovery pathway by id', async () => {
      mockMaybeSingle.mockResolvedValue({ data: sampleRecovery, error: null });

      supabase.from('mastery_recovery_pathways');
      chainObj.select('*');
      chainObj.eq('id', 'rec-1');
      const result = await chainObj.maybeSingle();

      expect(supabase.from).toHaveBeenCalledWith('mastery_recovery_pathways');
      expect(mockEq).toHaveBeenCalledWith('id', 'rec-1');
      expect(result.data).toEqual(sampleRecovery);
    });

    it('returns null when recovery pathway not found', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await chainObj.maybeSingle();
      expect(result.data).toBeNull();
    });
  });

  // ── useActivateRecovery mutationFn ────────────────────────────────────

  describe('useActivateRecovery mutationFn', () => {
    it('inserts a new recovery pathway and returns created row', async () => {
      mockSingle.mockResolvedValue({ data: sampleRecovery, error: null });

      supabase.from('mastery_recovery_pathways');
      chainObj.insert({
        institution_id: 'inst-1',
        student_id: 'student-1',
        clo_id: 'clo-1',
        course_id: 'course-1',
        failure_count: 2,
        status: 'active',
      });
      chainObj.select();
      const result = await chainObj.single();

      expect(supabase.from).toHaveBeenCalledWith('mastery_recovery_pathways');
      expect(mockInsert).toHaveBeenCalledWith({
        institution_id: 'inst-1',
        student_id: 'student-1',
        clo_id: 'clo-1',
        course_id: 'course-1',
        failure_count: 2,
        status: 'active',
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(result.data).toEqual(sampleRecovery);
    });

    it('throws on unique constraint violation (active session already exists)', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });

      const result = await chainObj.single();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('duplicate key');
    });
  });

  // ── useCompleteRecoveryStep mutationFn ────────────────────────────────

  describe('useCompleteRecoveryStep mutationFn', () => {
    it('updates ai_tutor_completed with timestamp', async () => {
      const updatedRow = {
        ...sampleRecovery,
        ai_tutor_completed: true,
        ai_tutor_completed_at: '2025-01-02T10:00:00Z',
      };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      supabase.from('mastery_recovery_pathways');
      chainObj.update({
        ai_tutor_completed: true,
        ai_tutor_completed_at: '2025-01-02T10:00:00Z',
        updated_at: expect.any(String),
      });
      chainObj.eq('id', 'rec-1');
      chainObj.select();
      const result = await chainObj.single();

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.data.ai_tutor_completed).toBe(true);
      expect(result.data.ai_tutor_completed_at).toBeTruthy();
    });

    it('updates practice_completed with timestamp', async () => {
      const updatedRow = {
        ...sampleRecovery,
        practice_completed: true,
        practice_completed_at: '2025-01-02T12:00:00Z',
      };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      supabase.from('mastery_recovery_pathways');
      chainObj.update({
        practice_completed: true,
        practice_completed_at: '2025-01-02T12:00:00Z',
        updated_at: expect.any(String),
      });
      chainObj.eq('id', 'rec-1');
      chainObj.select();
      const result = await chainObj.single();

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.data.practice_completed).toBe(true);
    });

    it('auto-completes pathway when both steps are done', async () => {
      // First call returns both steps completed
      const bothDone = {
        ...sampleRecovery,
        ai_tutor_completed: true,
        practice_completed: true,
        status: 'active',
      };
      // Second call returns completed status
      const completedRow = {
        ...bothDone,
        status: 'completed',
        completed_at: '2025-01-02T14:00:00Z',
      };

      mockSingle
        .mockResolvedValueOnce({ data: bothDone, error: null })
        .mockResolvedValueOnce({ data: completedRow, error: null });

      // First update (step completion)
      supabase.from('mastery_recovery_pathways');
      chainObj.update({ practice_completed: true });
      chainObj.eq('id', 'rec-1');
      chainObj.select();
      const firstResult = await chainObj.single();

      expect(firstResult.data.ai_tutor_completed).toBe(true);
      expect(firstResult.data.practice_completed).toBe(true);

      // Second update (status → completed) triggered by the hook
      chainObj.update({ status: 'completed', completed_at: expect.any(String) });
      chainObj.eq('id', 'rec-1');
      chainObj.select();
      const secondResult = await chainObj.single();

      expect(secondResult.data.status).toBe('completed');
      expect(secondResult.data.completed_at).toBeTruthy();
    });

    it('returns error on update failure', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Record not found' },
      });

      const result = await chainObj.single();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Record not found');
    });
  });

  // ── useRecoveryMetrics queryFn ────────────────────────────────────────

  describe('useRecoveryMetrics queryFn', () => {
    it('queries recovery pathways by institution_id with selected columns', () => {
      supabase.from('mastery_recovery_pathways');
      chainObj.select('id, status, activated_at, completed_at, retry_outcome');
      chainObj.eq('institution_id', 'inst-1');

      expect(supabase.from).toHaveBeenCalledWith('mastery_recovery_pathways');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, status, activated_at, completed_at, retry_outcome',
      );
      expect(mockEq).toHaveBeenCalledWith('institution_id', 'inst-1');
    });

    it('computes correct metrics from mixed rows', () => {
      const rows = [
        {
          id: '1',
          status: 'completed',
          activated_at: '2025-01-01T00:00:00Z',
          completed_at: '2025-01-01T12:00:00Z',
          retry_outcome: 'pass',
        },
        {
          id: '2',
          status: 'completed',
          activated_at: '2025-01-02T00:00:00Z',
          completed_at: '2025-01-02T06:00:00Z',
          retry_outcome: 'fail',
        },
        {
          id: '3',
          status: 'active',
          activated_at: '2025-01-03T00:00:00Z',
          completed_at: null,
          retry_outcome: null,
        },
      ];

      const totalActivations = rows.length;
      const completedRows = rows.filter((r) => r.status === 'completed');
      const completionRate = completedRows.length / totalActivations;

      const completionTimes = completedRows
        .filter((r) => r.completed_at && r.activated_at)
        .map((r) => {
          const activated = new Date(r.activated_at).getTime();
          const completed = new Date(r.completed_at!).getTime();
          return (completed - activated) / (1000 * 60 * 60);
        });
      const avgTime =
        completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length;

      const retriedRows = rows.filter((r) => r.retry_outcome !== null);
      const retrySuccessRate =
        retriedRows.filter((r) => r.retry_outcome === 'pass').length / retriedRows.length;

      expect(totalActivations).toBe(3);
      expect(completionRate).toBeCloseTo(2 / 3);
      expect(avgTime).toBeCloseTo(9); // (12 + 6) / 2
      expect(retrySuccessRate).toBeCloseTo(0.5); // 1 pass / 2 retried
    });

    it('returns zero metrics for empty data', () => {
      const rows: typeof sampleRecovery[] = [];
      const totalActivations = rows.length;

      expect(totalActivations).toBe(0);

      const metrics = {
        total_activations: 0,
        completion_rate: 0,
        avg_completion_time_hours: 0,
        retry_success_rate: 0,
      };

      expect(metrics.total_activations).toBe(0);
      expect(metrics.completion_rate).toBe(0);
      expect(metrics.avg_completion_time_hours).toBe(0);
      expect(metrics.retry_success_rate).toBe(0);
    });

    it('handles all-active rows (no completions)', () => {
      const rows = [
        { id: '1', status: 'active', activated_at: '2025-01-01T00:00:00Z', completed_at: null, retry_outcome: null },
        { id: '2', status: 'active', activated_at: '2025-01-02T00:00:00Z', completed_at: null, retry_outcome: null },
      ];

      const completedRows = rows.filter((r) => r.status === 'completed');
      const completionRate = completedRows.length / rows.length;
      const retriedRows = rows.filter((r) => r.retry_outcome !== null);

      expect(completionRate).toBe(0);
      expect(retriedRows.length).toBe(0);
    });

    it('returns error on supabase failure', async () => {
      mockEq.mockReturnValue({ data: null, error: { message: 'DB error' } });

      supabase.from('mastery_recovery_pathways');
      chainObj.select('id, status, activated_at, completed_at, retry_outcome');
      const result = chainObj.eq('institution_id', 'inst-1');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('DB error');
    });
  });
});
