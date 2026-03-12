import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateUserFormData, UpdateUserFormData } from '@/lib/schemas/user';
import type { Profile } from '@/types/app';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';
import { sanitizePostgrestValue } from '@/lib/sanitizeFilter';



// ─── Filter types ────────────────────────────────────────────────────────────

export interface UserFilters {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

// ─── useUsers — list users with optional search/role filter ──────────────────

export const useUsers = (filters: UserFilters = {}) => {
  const { page, pageSize, from, to } = getPaginationRange(filters.page, filters.pageSize);

  return useQuery({
    queryKey: queryKeys.users.list({ ...filters, page, pageSize } as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedResult<Profile>> => {
      let query = supabase.from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.search) {
        const safe = sanitizePostgrestValue(filters.search);
        query = query.or(
          `full_name.ilike.%${safe}%,email.ilike.%${safe}%`,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as Profile[], count: count ?? 0, page, pageSize };
    },
  });
};

// ─── useCoordinators — fetch active coordinators for assignment dropdowns ────

export const useCoordinators = () => {
  return useQuery({
    queryKey: queryKeys.users.list({ role: 'coordinator' }),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles')
        .select('*')
        .eq('role', 'coordinator')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
  });
};

// ─── useUser — single user detail ───────────────────────────────────────────

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!id,
  });
};

// ─── useCreateUser — insert into profiles table ─────────────────────────────

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateUserFormData): Promise<Profile> => {
      const { data: result, error } = await supabase.from('profiles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      const profile = result as Profile;

      await logAuditEvent({
        action: 'create',
        entity_type: 'user',
        entity_id: profile.id,
        changes: data,
        performed_by: user?.id ?? 'unknown',
      });

      return profile;
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
    mutationFn: async (data: UpdateUserFormData): Promise<Profile> => {
      const { data: result, error } = await supabase.from('profiles')
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

      return result as Profile;
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
    mutationFn: async (id: string): Promise<Profile> => {
      const { data: result, error } = await supabase.from('profiles')
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

      return result as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};
