import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateProgramFormData, UpdateProgramFormData } from '@/lib/schemas/program';
import type { Program } from '@/types/app';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';



// ─── Filter types ────────────────────────────────────────────────────────────

export interface ProgramFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── usePrograms — list programs with optional search filter ─────────────────

export const usePrograms = (filters: ProgramFilters = {}) => {
  const { page, pageSize, from, to } = getPaginationRange(filters.page, filters.pageSize);

  return useQuery({
    queryKey: queryKeys.programs.list({ ...filters, page, pageSize } as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedResult<Program>> => {
      let query = supabase.from('programs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as Program[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── useProgram — single program detail ─────────────────────────────────────

export const useProgram = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.programs.detail(id ?? ''),
    queryFn: async (): Promise<Program | null> => {
      const { data, error } = await supabase.from('programs')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as Program | null;
    },
    enabled: !!id,
  });
};

// ─── useCreateProgram — insert into programs table ──────────────────────────

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateProgramFormData): Promise<Program> => {
      const { data: result, error } = await supabase.from('programs')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      const program = result as Program;

      await logAuditEvent({
        action: 'create',
        entity_type: 'program',
        entity_id: program.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.lists() });
    },
  });
};

// ─── useUpdateProgram — update programs table ───────────────────────────────

export const useUpdateProgram = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateProgramFormData): Promise<Program> => {
      const { data: result, error } = await supabase.from('programs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'program',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result as Program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(id) });
    },
  });
};

// ─── useSoftDeleteProgram — set is_active = false ───────────────────────────

export const useSoftDeleteProgram = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Program> => {
      const { data: result, error } = await supabase.from('programs')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'program',
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? 'unknown',
      });

      return result as Program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.lists() });
    },
  });
};
