import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  diff: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  search?: string;
  action?: string;
  entityType?: string;
}

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<AuditLogRecord[]> => {
      let query = db
        .from('audit_logs')
        .select('id, actor_id, action, target_type, target_id, diff, ip_address, created_at')
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.entityType) {
        query = query.eq('target_type', filters.entityType);
      }

      if (filters.search) {
        query = query.or(
          `action.ilike.%${filters.search}%,target_type.ilike.%${filters.search}%,target_id.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AuditLogRecord[];
    },
    staleTime: 30_000,
  });
};
