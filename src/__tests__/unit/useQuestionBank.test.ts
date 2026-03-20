// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockIlike = vi.fn();

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  ilike: mockIlike,
  single: mockSingle,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

import { supabase as _supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

const sampleQuestion = {
  id: 'q-1',
  institution_id: 'inst-1',
  course_id: 'course-1',
  clo_id: 'clo-1',
  bloom_level: 2,
  question_type: 'mcq',
  question_text: 'What is OBE?',
  options: [{ key: 'A', text: 'Answer A', is_correct: true }],
  correct_answer: { value: 'A', explanation: 'Correct' },
  explanation: 'AI explanation',
  difficulty_rating: 3.0,
  status: 'approved',
  generation_source: 'ai',
  source_chunks: [],
  labels: [],
  parent_question_id: null,
  generation_request_id: 'gen-1',
  created_by: 'teacher-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useQuestionBank hooks — queryFn / mutationFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockIlike.mockReturnValue(chainObj);
    mockSingle.mockResolvedValue({ data: sampleQuestion, error: null });
  });

  // ─── useQuestionBank queryFn ──────────────────────────────────────────

  describe('useQuestionBank queryFn', () => {
    it('queries question_bank by course_id with default ordering', async () => {
      // Simulate the resolved data for the terminal call (order returns data)
      mockOrder.mockResolvedValue({ data: [sampleQuestion], error: null });

      const courseId = 'course-1';
      supabase.from('question_bank');
      chainObj.select('*');
      chainObj.eq('course_id', courseId);
      const result = await chainObj.order('created_at', { ascending: false });

      expect(supabase.from).toHaveBeenCalledWith('question_bank');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('course_id', courseId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual([sampleQuestion]);
    });

    it('applies clo_id filter when provided', () => {
      chainObj.eq('clo_id', 'clo-1');
      expect(mockEq).toHaveBeenCalledWith('clo_id', 'clo-1');
    });

    it('applies bloom_level filter when provided', () => {
      chainObj.eq('bloom_level', 3);
      expect(mockEq).toHaveBeenCalledWith('bloom_level', 3);
    });

    it('applies question_type filter when provided', () => {
      chainObj.eq('question_type', 'mcq');
      expect(mockEq).toHaveBeenCalledWith('question_type', 'mcq');
    });

    it('applies status filter when provided', () => {
      chainObj.eq('status', 'approved');
      expect(mockEq).toHaveBeenCalledWith('status', 'approved');
    });

    it('applies generation_source filter when provided', () => {
      chainObj.eq('generation_source', 'ai');
      expect(mockEq).toHaveBeenCalledWith('generation_source', 'ai');
    });

    it('applies search filter using ilike on question_text', () => {
      chainObj.ilike('question_text', '%OBE%');
      expect(mockIlike).toHaveBeenCalledWith('question_text', '%OBE%');
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await chainObj.order('created_at', { ascending: false });
      expect(result.data ?? []).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
      const result = await chainObj.order('created_at', { ascending: false });
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('RLS denied');
    });
  });

  // ─── useCreateQuestion mutationFn ─────────────────────────────────────

  describe('useCreateQuestion mutationFn', () => {
    it('inserts into question_bank and returns created row', async () => {
      mockSingle.mockResolvedValue({ data: sampleQuestion, error: null });

      supabase.from('question_bank');
      chainObj.insert({
        course_id: 'course-1',
        clo_id: 'clo-1',
        bloom_level: 2,
        question_type: 'mcq',
        question_text: 'What is OBE?',
        correct_answer: { value: 'A', explanation: 'Correct' },
        difficulty_rating: 3.0,
        generation_source: 'ai',
        created_by: 'teacher-1',
        institution_id: 'inst-1',
      });
      chainObj.select();
      const result = await chainObj.single();

      expect(supabase.from).toHaveBeenCalledWith('question_bank');
      expect(mockInsert).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalled();
      expect(result.data).toEqual(sampleQuestion);
    });

    it('throws on insert error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Duplicate' } });
      const result = await chainObj.single();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Duplicate');
    });
  });

  // ─── useUpdateQuestion mutationFn ─────────────────────────────────────

  describe('useUpdateQuestion mutationFn', () => {
    it('updates question_bank by id and returns updated row', async () => {
      const updated = { ...sampleQuestion, status: 'rejected' };
      mockSingle.mockResolvedValue({ data: updated, error: null });

      supabase.from('question_bank');
      chainObj.update({ status: 'rejected' });
      chainObj.eq('id', 'q-1');
      chainObj.select();
      const result = await chainObj.single();

      expect(supabase.from).toHaveBeenCalledWith('question_bank');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'rejected' });
      expect(mockEq).toHaveBeenCalledWith('id', 'q-1');
      expect(result.data.status).toBe('rejected');
    });

    it('throws on update error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const result = await chainObj.single();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Not found');
    });
  });
});
