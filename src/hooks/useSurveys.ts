import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import type { Json } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SurveyType = 'course_exit' | 'graduate_exit' | 'employer';
export type QuestionType = 'likert' | 'mcq' | 'text';

export interface Survey {
  id: string;
  institution_id: string;
  title: string;
  type: SurveyType;
  target_outcomes: string[];
  is_active: boolean;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  sort_order: number;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  question_id: string;
  respondent_id: string;
  response_value: string;
  created_at: string;
}

export interface CreateSurveyInput {
  institution_id: string;
  title: string;
  type: SurveyType;
  target_outcomes: string[];
  is_active: boolean;
}

export interface CreateSurveyQuestionInput {
  survey_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  sort_order: number;
}

export interface SubmitSurveyResponseInput {
  survey_id: string;
  respondent_id: string;
  responses: Array<{ question_id: string; response_value: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function castSurvey(row: Record<string, unknown>): Survey {
  const raw = row.target_outcomes;
  const outcomes = Array.isArray(raw) ? (raw as string[]) : [];
  return {
    id: row.id as string,
    institution_id: row.institution_id as string,
    title: row.title as string,
    type: row.type as SurveyType,
    target_outcomes: outcomes,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  };
}

function castQuestion(row: Record<string, unknown>): SurveyQuestion {
  const raw = row.options;
  const options = Array.isArray(raw) ? (raw as string[]) : null;
  return {
    id: row.id as string,
    survey_id: row.survey_id as string,
    question_text: row.question_text as string,
    question_type: row.question_type as QuestionType,
    options,
    sort_order: row.sort_order as number,
  };
}

// ─── Survey Queries ─────────────────────────────────────────────────────────

export const useSurveys = (filters: Record<string, unknown> = {}) => {
  return useQuery({
    queryKey: queryKeys.surveys.list(filters),
    queryFn: async (): Promise<Survey[]> => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, institution_id, title, type, target_outcomes, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => castSurvey(r as unknown as Record<string, unknown>));
    },
  });
};

export const useSurvey = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveys.detail(surveyId ?? ''),
    queryFn: async (): Promise<Survey | null> => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, institution_id, title, type, target_outcomes, is_active, created_at')
        .eq('id', surveyId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return castSurvey(data as unknown as Record<string, unknown>);
    },
    enabled: !!surveyId,
  });
};

// ─── Survey Questions ───────────────────────────────────────────────────────

export const useSurveyQuestions = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveyQuestions.list({ surveyId: surveyId ?? '' }),
    queryFn: async (): Promise<SurveyQuestion[]> => {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, survey_id, question_text, question_type, options, sort_order')
        .eq('survey_id', surveyId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => castQuestion(r as unknown as Record<string, unknown>));
    },
    enabled: !!surveyId,
  });
};

// ─── Survey Responses ───────────────────────────────────────────────────────

export const useSurveyResponses = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveyResponses.list({ surveyId: surveyId ?? '' }),
    queryFn: async (): Promise<SurveyResponse[]> => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, survey_id, question_id, respondent_id, response_value, created_at')
        .eq('survey_id', surveyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SurveyResponse[];
    },
    enabled: !!surveyId,
  });
};

export const useHasRespondedToSurvey = (surveyId: string | undefined, respondentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveyResponses.list({ surveyId: surveyId ?? '', respondentId: respondentId ?? '', check: true }),
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('survey_responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', surveyId!)
        .eq('respondent_id', respondentId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!surveyId && !!respondentId,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ performedBy, ...input }: CreateSurveyInput & { performedBy: string }) => {
      const { data, error } = await supabase
        .from('surveys')
        .insert({
          institution_id: input.institution_id,
          title: input.title,
          type: input.type,
          target_outcomes: input.target_outcomes as unknown as Json,
          is_active: input.is_active,
        })
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: 'create',
        entity_type: 'survey',
        entity_id: data.id,
        changes: { title: input.title, type: input.type, is_active: input.is_active },
        performed_by: performedBy,
      });
      return castSurvey(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.lists() });
    },
  });
};

export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, performedBy, ...input }: Partial<CreateSurveyInput> & { id: string; performedBy: string }) => {
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title;
      if (input.type !== undefined) payload.type = input.type;
      if (input.target_outcomes !== undefined) payload.target_outcomes = input.target_outcomes;
      if (input.is_active !== undefined) payload.is_active = input.is_active;

      const { data, error } = await supabase
        .from('surveys')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: 'update',
        entity_type: 'survey',
        entity_id: id,
        changes: payload,
        performed_by: performedBy,
      });
      return castSurvey(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(variables.id) });
    },
  });
};

export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, performedBy }: { id: string; performedBy: string }) => {
      const { error } = await supabase.from('surveys').delete().eq('id', id);
      if (error) throw error;
      await logAuditEvent({
        action: 'delete',
        entity_type: 'survey',
        entity_id: id,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.lists() });
    },
  });
};

// ─── Question Mutations ─────────────────────────────────────────────────────

export const useCreateSurveyQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSurveyQuestionInput) => {
      const { data, error } = await supabase
        .from('survey_questions')
        .insert({
          survey_id: input.survey_id,
          question_text: input.question_text,
          question_type: input.question_type,
          options: input.options as unknown as Json,
          sort_order: input.sort_order,
        })
        .select()
        .single();
      if (error) throw error;
      return castQuestion(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveyQuestions.list({ surveyId: variables.survey_id }) });
    },
  });
};

export const useUpdateSurveyQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, surveyId: _surveyId, ...input }: Partial<CreateSurveyQuestionInput> & { id: string; surveyId: string }) => {
      const payload: Record<string, unknown> = {};
      if (input.question_text !== undefined) payload.question_text = input.question_text;
      if (input.question_type !== undefined) payload.question_type = input.question_type;
      if (input.options !== undefined) payload.options = input.options;
      if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

      const { data, error } = await supabase
        .from('survey_questions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return castQuestion(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveyQuestions.list({ surveyId: variables.surveyId }) });
    },
  });
};

export const useDeleteSurveyQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; surveyId: string }) => {
      const { error } = await supabase.from('survey_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveyQuestions.list({ surveyId: variables.surveyId }) });
    },
  });
};

// ─── Response Mutations ─────────────────────────────────────────────────────

export const useSubmitSurveyResponse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitSurveyResponseInput) => {
      const rows = input.responses.map((r) => ({
        survey_id: input.survey_id,
        question_id: r.question_id,
        respondent_id: input.respondent_id,
        response_value: r.response_value,
      }));
      const { error } = await supabase.from('survey_responses').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveyResponses.list({ surveyId: variables.survey_id }) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.surveyResponses.list({
          surveyId: variables.survey_id,
          respondentId: variables.respondent_id,
          check: true,
        }),
      });
    },
  });
};
