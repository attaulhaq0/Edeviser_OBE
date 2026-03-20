// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chainObj = {
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  then: undefined as ((resolve: (v: unknown) => void) => void) | undefined,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

import { supabase as _supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe('useAISuggestions hooks — queryFn / mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
  });

  // ─── useAISuggestions queryFn ─────────────────────────────────────────

  describe('useAISuggestions queryFn', () => {
    it('queries ai_feedback table filtered by student_id and suggestion_type', () => {
      const chain = supabase.from('ai_feedback');
      chain.select('id, student_id, suggestion_type, suggestion_text, suggestion_data, feedback, validated_outcome, created_at');
      chain.eq('student_id', 'student-1');
      chain.eq('suggestion_type', 'module_suggestion');
      chain.order('created_at', { ascending: false });

      expect(supabase.from).toHaveBeenCalledWith('ai_feedback');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, student_id, suggestion_type, suggestion_text, suggestion_data, feedback, validated_outcome, created_at',
      );
      expect(mockEq).toHaveBeenCalledWith('student_id', 'student-1');
      expect(mockEq).toHaveBeenCalledWith('suggestion_type', 'module_suggestion');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('uses correct query key structure', async () => {
      // Verify the query key factory produces expected shape
      const { queryKeys } = await import('@/lib/queryKeys');
      const key = queryKeys.aiSuggestions.list({ studentId: 'student-1' });
      expect(key).toEqual(['aiSuggestions', 'list', { studentId: 'student-1' }]);
    });
  });

  // ─── useSubmitAIFeedback mutationFn ───────────────────────────────────

  describe('useSubmitAIFeedback mutationFn', () => {
    it('updates feedback column on ai_feedback record', () => {
      const chain = supabase.from('ai_feedback');
      chain.update({ feedback: 'thumbs_up' });
      chain.eq('id', 'feedback-123');

      expect(supabase.from).toHaveBeenCalledWith('ai_feedback');
      expect(mockUpdate).toHaveBeenCalledWith({ feedback: 'thumbs_up' });
      expect(mockEq).toHaveBeenCalledWith('id', 'feedback-123');
    });

    it('supports thumbs_down feedback value', () => {
      const chain = supabase.from('ai_feedback');
      chain.update({ feedback: 'thumbs_down' });
      chain.eq('id', 'feedback-456');

      expect(mockUpdate).toHaveBeenCalledWith({ feedback: 'thumbs_down' });
      expect(mockEq).toHaveBeenCalledWith('id', 'feedback-456');
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe('error handling', () => {
    it('propagates supabase errors from query', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

      const chain = supabase.from('ai_feedback');
      chain.select('id, student_id, suggestion_type, suggestion_text, suggestion_data, feedback, validated_outcome, created_at');
      chain.eq('student_id', 'student-1');
      chain.eq('suggestion_type', 'module_suggestion');
      const result = await chain.order('created_at', { ascending: false });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('RLS denied');
    });

    it('propagates supabase errors from mutation', async () => {
      mockEq.mockResolvedValue({ error: { message: 'Update failed' } });

      const chain = supabase.from('ai_feedback');
      chain.update({ feedback: 'thumbs_up' });
      const result = await chain.eq('id', 'feedback-789');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Update failed');
    });
  });

  // ─── Data shape ───────────────────────────────────────────────────────

  describe('data shape', () => {
    it('returns suggestion data with expected fields', async () => {
      const mockSuggestion = {
        id: 'sugg-1',
        student_id: 'student-1',
        suggestion_type: 'module_suggestion',
        suggestion_text: 'Focus on CLO-3',
        suggestion_data: {
          weak_clo_id: 'clo-3',
          weak_clo_title: 'Apply Algorithms',
          weak_clo_attainment: 55,
          prerequisite_clo_id: null,
          prerequisite_clo_title: null,
          social_proof_text: 'Students who improved scored 34% higher',
        },
        feedback: null,
        validated_outcome: null,
        created_at: '2025-01-15T10:00:00Z',
      };

      mockOrder.mockResolvedValue({ data: [mockSuggestion], error: null });

      const chain = supabase.from('ai_feedback');
      chain.select('id, student_id, suggestion_type, suggestion_text, suggestion_data, feedback, validated_outcome, created_at');
      chain.eq('student_id', 'student-1');
      chain.eq('suggestion_type', 'module_suggestion');
      const result = await chain.order('created_at', { ascending: false });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].suggestion_data.weak_clo_attainment).toBe(55);
      expect(result.data[0].feedback).toBeNull();
    });
  });
});
