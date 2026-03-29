import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Semester } from '@/types/app';

// ─── useSemesters — list all semesters ───────────────────────────────────────

export const useSemesters = () => {
  return useQuery({
    queryKey: queryKeys.semesters.lists(),
    queryFn: async (): Promise<Semester[]> => {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Semester[];
    },
  });
};

// ─── useActiveSemester — get the single active semester ──────────────────────

export const useActiveSemester = () => {
  return useQuery({
    queryKey: queryKeys.semesters.list({ active: true }),
    queryFn: async (): Promise<Semester | null> => {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Semester | null;
    },
  });
};

// ─── useSemester — single semester detail ────────────────────────────────────

export const useSemester = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.semesters.detail(id ?? ''),
    queryFn: async (): Promise<Semester | null> => {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as Semester | null;
    },
    enabled: !!id,
  });
};


// ─── useCreateSemester — insert with audit logging ───────────────────────────

export interface CreateSemesterInput {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  institution_id: string;
}

export const useCreateSemester = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSemesterInput): Promise<Semester> => {
      // If setting as active, deactivate all others first (single-active enforcement)
      if (input.is_active) {
        const { error: deactivateError } = await supabase
          .from('semesters')
          .update({ is_active: false })
          .eq('institution_id', input.institution_id)
          .eq('is_active', true);
        if (deactivateError) throw deactivateError;
      }

      const { data, error } = await supabase
        .from('semesters')
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        action: 'create',
        entity_type: 'semester',
        entity_id: data.id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return data as Semester;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.semesters.all });
      toast.success('Semester created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create semester'),
  });
};

// ─── useUpdateSemester — update with audit logging ───────────────────────────

export interface UpdateSemesterInput {
  name?: string;
  code?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export const useUpdateSemester = (id: string) => {
  const qc = useQueryClient();
  const { user, institutionId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateSemesterInput): Promise<Semester> => {
      // If activating, deactivate all others first (single-active enforcement)
      if (input.is_active && institutionId) {
        const { error: deactivateError } = await supabase
          .from('semesters')
          .update({ is_active: false })
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .neq('id', id);
        if (deactivateError) throw deactivateError;
      }

      const { data, error } = await supabase
        .from('semesters')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'semester',
        entity_id: id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return data as Semester;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.semesters.all });
      toast.success('Semester updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update semester'),
  });
};

// ─── useDeleteSemester — delete with audit logging ───────────────────────────

export const useDeleteSemester = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('semesters').delete().eq('id', id);
      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        entity_type: 'semester',
        entity_id: id,
        changes: null,
        performed_by: user?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.semesters.all });
      toast.success('Semester deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete semester'),
  });
};

// ─── useToggleSemesterActive — toggle active status ──────────────────────────

export const useToggleSemesterActive = () => {
  const qc = useQueryClient();
  const { user, institutionId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<Semester> => {
      // If activating, deactivate all others first
      if (is_active && institutionId) {
        const { error: deactivateError } = await supabase
          .from('semesters')
          .update({ is_active: false })
          .eq('institution_id', institutionId)
          .eq('is_active', true);
        if (deactivateError) throw deactivateError;
      }

      const { data, error } = await supabase
        .from('semesters')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'semester',
        entity_id: id,
        changes: { is_active },
        performed_by: user?.id ?? 'unknown',
      });

      return data as Semester;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.semesters.all });
      toast.success('Semester status updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update semester'),
  });
};
