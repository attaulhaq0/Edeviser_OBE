import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Json } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuestionBankFilters {
  clo_id?: string;
  bloom_level?: number;
  question_type?: string;
  status?: string;
  generation_source?: string;
  search?: string;
}

export interface QuestionBankRow {
  id: string;
  institution_id: string;
  course_id: string;
  clo_id: string;
  bloom_level: number;
  question_type: string;
  question_text: string;
  options: Json | null;
  correct_answer: Json;
  explanation: string | null;
  difficulty_rating: number;
  status: string;
  generation_source: string;
  source_chunks: Json | null;
  labels: string[];
  parent_question_id: string | null;
  generation_request_id: string | null;
  created_by: string;
  explanation_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionInput {
  institution_id: string;
  course_id: string;
  clo_id: string;
  bloom_level: number;
  question_type: string;
  question_text: string;
  options?: Json | null;
  correct_answer: Json;
  explanation?: string;
  difficulty_rating: number;
  status?: string;
  generation_source: string;
  source_chunks?: Json | null;
  labels?: string[];
  parent_question_id?: string;
  generation_request_id?: string;
  created_by: string;
}

export interface UpdateQuestionInput {
  id: string;
  question_text?: string;
  options?: Json | null;
  correct_answer?: Json;
  explanation?: string;
  difficulty_rating?: number;
  status?: string;
  generation_source?: string;
  labels?: string[];
  bloom_level?: number;
  clo_id?: string;
}

// ─── useQuestionBank — list questions with optional filters ─────────────────

export const useQuestionBank = (courseId: string, filters: QuestionBankFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.questionBank.list({ courseId, ...filters }),
    queryFn: async (): Promise<QuestionBankRow[]> => {
      let query = supabase
        .from('question_bank')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (filters.clo_id) {
        query = query.eq('clo_id', filters.clo_id);
      }
      if (filters.bloom_level !== undefined) {
        query = query.eq('bloom_level', filters.bloom_level);
      }
      if (filters.question_type) {
        query = query.eq('question_type', filters.question_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.generation_source) {
        query = query.eq('generation_source', filters.generation_source);
      }
      if (filters.search) {
        query = query.ilike('question_text', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as QuestionBankRow[];
    },
    enabled: !!courseId,
  });
};

// ─── useCreateQuestion — insert a new question ─────────────────────────────

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuestionInput): Promise<QuestionBankRow> => {
      const { data, error } = await supabase
        .from('question_bank')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as QuestionBankRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
    },
  });
};

// ─── useUpdateQuestion — update an existing question by id ──────────────────

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateQuestionInput): Promise<QuestionBankRow> => {
      const { id, ...fields } = input;

      const { data, error } = await supabase
        .from('question_bank')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuestionBankRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBank.lists() });
    },
  });
};
