import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/providers/AuthProvider';
import type { CreateUserFormData, UpdateUserFormData } from '@/lib/schemas/user';

// ─── Filter types ────────────────────────────────────────────────────────────

export interface UserFilters {
  search?: string;
  role?: string;
}

// ─── useUsers — list users with optional search/role filter ──────────────────

export const useUsers = (filters: UserFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ─── useUser — single user detail ───────────────────────────────────────────

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};


// ─── useCreateUser — insert into profiles table ─────────────────────────────

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'create',
        entity_type: 'user',
        entity_id: result.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};

// ─── useUpdateUser — update profiles table ──────────────────────────────────

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'user',
        entity_id: id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
    },
  });
};

// ─── useSoftDeleteUser — set is_active = false ──────────────────────────────

export const useSoftDeleteUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'user',
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? 'unknown',
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};
