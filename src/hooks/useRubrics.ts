import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Rubric {
  id: string;
  title: string;
  clo_id: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface RubricCriterion {
  id: string;
  rubric_id: string;
  criterion_name: string;
  sort_order: number;
  levels: Array<{ label: string; description: string; points: number }>;
  max_points: number;
}

export interface RubricWithCriteria extends Rubric {
  criteria: RubricCriterion[];
}

interface CreateRubricInput {
  title: string;
  clo_id: string;
  is_template: boolean;
  criteria: Array<{
    criterion_name: string;
    sort_order: number;
    levels: Array<{ label: string; description: string; points: number }>;
    max_points: number;
  }>;
}

// ─── useRubrics — list rubrics, optionally filtered by courseId ──────────────

export const useRubrics = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.rubrics.list({ courseId }),
    queryFn: async (): Promise<Rubric[]> => {
      if (courseId) {
        // Get CLO ids for this course, then filter rubrics
        const { data: clos, error: closError } = await db
          .from('learning_outcomes')
          .select('id')
          .eq('type', 'CLO')
          .eq('course_id', courseId);

        if (closError) throw closError;

        const cloIds = (clos as Array<{ id: string }>).map((c) => c.id);
        if (cloIds.length === 0) return [];

        const { data, error } = await db
          .from('rubrics')
          .select('*')
          .in('clo_id', cloIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Rubric[];
      }

      const { data, error } = await db
        .from('rubrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Rubric[];
    },
  });
};


// ─── useRubric — single rubric with criteria ────────────────────────────────

export const useRubric = (id?: string) => {
  return useQuery({
    queryKey: queryKeys.rubrics.detail(id ?? ''),
    queryFn: async (): Promise<RubricWithCriteria | null> => {
      const { data: rubric, error } = await db
        .from('rubrics')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      if (!rubric) return null;

      const { data: criteria, error: criteriaError } = await db
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', id!)
        .order('sort_order', { ascending: true });

      if (criteriaError) throw criteriaError;

      return {
        ...(rubric as Rubric),
        criteria: (criteria ?? []) as RubricCriterion[],
      };
    },
    enabled: !!id,
  });
};

// ─── useCreateRubric — insert rubric + criteria rows ────────────────────────

export const useCreateRubric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRubricInput): Promise<Rubric> => {
      const { criteria, ...rubricFields } = input;

      const { data: rubric, error } = await db
        .from('rubrics')
        .insert(rubricFields)
        .select()
        .single();

      if (error) throw error;

      const created = rubric as Rubric;

      if (criteria.length > 0) {
        const rows = criteria.map((c) => ({
          rubric_id: created.id,
          criterion_name: c.criterion_name,
          sort_order: c.sort_order,
          levels: c.levels,
          max_points: c.max_points,
        }));

        const { error: criteriaError } = await db
          .from('rubric_criteria')
          .insert(rows);

        if (criteriaError) throw criteriaError;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rubrics.lists() });
    },
  });
};

// ─── useUpdateRubric — update rubric + replace criteria ─────────────────────

export const useUpdateRubric = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRubricInput): Promise<Rubric> => {
      const { criteria, ...rubricFields } = input;

      const { data: rubric, error } = await db
        .from('rubrics')
        .update(rubricFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Delete existing criteria and re-insert
      const { error: deleteError } = await db
        .from('rubric_criteria')
        .delete()
        .eq('rubric_id', id);

      if (deleteError) throw deleteError;

      if (criteria.length > 0) {
        const rows = criteria.map((c) => ({
          rubric_id: id,
          criterion_name: c.criterion_name,
          sort_order: c.sort_order,
          levels: c.levels,
          max_points: c.max_points,
        }));

        const { error: criteriaError } = await db
          .from('rubric_criteria')
          .insert(rows);

        if (criteriaError) throw criteriaError;
      }

      return rubric as Rubric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rubrics.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rubrics.detail(id) });
    },
  });
};

// ─── useDeleteRubric — delete criteria then rubric ──────────────────────────

export const useDeleteRubric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error: criteriaError } = await db
        .from('rubric_criteria')
        .delete()
        .eq('rubric_id', id);

      if (criteriaError) throw criteriaError;

      const { error } = await db
        .from('rubrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rubrics.lists() });
    },
  });
};

// ─── useRubricTemplates — list rubrics where is_template = true ─────────────

export const useRubricTemplates = () => {
  return useQuery({
    queryKey: queryKeys.rubrics.list({ isTemplate: true }),
    queryFn: async (): Promise<Rubric[]> => {
      const { data, error } = await db
        .from('rubrics')
        .select('*')
        .eq('is_template', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Rubric[];
    },
  });
};

// ─── useCopyRubric — copy rubric + criteria as a new non-template ───────────

export const useCopyRubric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string): Promise<Rubric> => {
      // Fetch original rubric
      const { data: original, error: fetchError } = await db
        .from('rubrics')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (fetchError) throw fetchError;

      const src = original as Rubric;

      // Fetch original criteria
      const { data: srcCriteria, error: criteriaFetchError } = await db
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', sourceId)
        .order('sort_order', { ascending: true });

      if (criteriaFetchError) throw criteriaFetchError;

      // Insert copied rubric
      const { data: newRubric, error: insertError } = await db
        .from('rubrics')
        .insert({
          title: `${src.title} (Copy)`,
          clo_id: src.clo_id,
          is_template: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const created = newRubric as Rubric;

      // Insert copied criteria
      const criteria = (srcCriteria ?? []) as RubricCriterion[];
      if (criteria.length > 0) {
        const rows = criteria.map((c) => ({
          rubric_id: created.id,
          criterion_name: c.criterion_name,
          sort_order: c.sort_order,
          levels: c.levels,
          max_points: c.max_points,
        }));

        const { error: criteriaInsertError } = await db
          .from('rubric_criteria')
          .insert(rows);

        if (criteriaInsertError) throw criteriaInsertError;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rubrics.lists() });
    },
  });
};
