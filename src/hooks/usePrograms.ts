import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateProgramFormData, UpdateProgramFormData } from '@/lib/schemas/program';
import type { Program } from '@/types/app';

// The generated database.ts doesn't have the `programs` table yet.
// We cast through `unknown` once to bridge the gap until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Filter types ────────────────────────────────────────────────────────────

export interface ProgramFilters {
  search?: string;
}

// ─── usePrograms — list programs with optional search filter ─────────────────

export const usePrograms = (filters: ProgramFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.programs.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<Program[]> => {
      let query = db
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Program[];
    },
  });
};

// ─── useProgram — single program detail ─────────────────────────────────────

export const useProgram = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.programs.detail(id ?? ''),
    queryFn: async (): Promise<Program | null> => {
      const { data, error } = await db
        .from('programs')
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
      const { data: result, error } = await db
        .from('programs')
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
      const { data: result, error } = await db
        .from('programs')
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
      const { data: result, error } = await db
        .from('programs')
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
