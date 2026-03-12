import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { PaginatedResult } from '@/types/pagination';
import { getPaginationRange } from '@/types/pagination';
import { sanitizePostgrestValue } from '@/lib/sanitizeFilter';



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
  page?: number;
  pageSize?: number;
}

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  const { page, pageSize, from, to } = getPaginationRange(filters.page, filters.pageSize);

  return useQuery({
    queryKey: queryKeys.auditLogs.list({ ...filters, page, pageSize } as Record<string, unknown>),
    queryFn: async (): Promise<PaginatedResult<AuditLogRecord>> => {
      let query = supabase.from('audit_logs')
        .select('id, actor_id, action, target_type, target_id, diff, ip_address, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.entityType) {
        query = query.eq('target_type', filters.entityType);
      }

      if (filters.search) {
        const safe = sanitizePostgrestValue(filters.search);
        query = query.or(
          `action.ilike.%${safe}%,target_type.ilike.%${safe}%,target_id.ilike.%${safe}%`,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as AuditLogRecord[], count: count ?? 0, page, pageSize };
    },
    staleTime: 30_000,
  });
};
