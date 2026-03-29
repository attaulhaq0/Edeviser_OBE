// Task 60: Department management hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Department {
  id: string;
  name: string;
  code: string;
  head_of_department_id: string | null;
  institution_id: string;
  created_at: string;
}

export const useDepartments = () => {
  return useQuery({
    queryKey: queryKeys.departments.lists(),
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });
};

export const useDepartment = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.departments.detail(id ?? ''),
    queryFn: async (): Promise<Department | null> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as Department | null;
    },
    enabled: !!id,
  });
};

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; institution_id: string; head_of_department_id?: string }) => {
      const { data, error } = await supabase.from('departments').insert(input).select().single();
      if (error) throw error;
      await logAuditEvent({ action: 'create', entity_type: 'department', entity_id: data.id, changes: input, performed_by: user?.id ?? 'unknown' });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.departments.all }); toast.success('Department created'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create department'),
  });
};

export const useUpdateDepartment = (id: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name?: string; code?: string; head_of_department_id?: string | null }) => {
      const { data, error } = await supabase.from('departments').update(input).eq('id', id).select().single();
      if (error) throw error;
      await logAuditEvent({ action: 'update', entity_type: 'department', entity_id: id, changes: input, performed_by: user?.id ?? 'unknown' });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments.all });
      qc.invalidateQueries({ queryKey: queryKeys.departments.detail(id) });
      toast.success('Department updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update department'),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      // Atomic delete: only succeeds if no programs reference this department.
      // Uses a single RPC call to avoid TOCTOU race between check and delete.
      const { data, error } = await supabase.rpc('delete_department_if_no_programs' as never, { dept_id: id } as never);
      if (error) throw new Error(`Delete failed: ${(error as { message: string }).message}`);
      if (data === false) throw new Error('Cannot delete department with active programs');
      await logAuditEvent({ action: 'delete', entity_type: 'department', entity_id: id, changes: null, performed_by: user?.id ?? 'unknown' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.departments.all }); toast.success('Department deleted'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });
};
