import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface AdminKPIData {
  totalUsers: number;
  activeUsers: number;
  totalPrograms: number;
  totalCourses: number;
  usersByRole: Record<string, number>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by: string;
  created_at: string;
}

export const useAdminKPIs = () => {
  return useQuery({
    queryKey: queryKeys.adminDashboard.list({}),
    queryFn: async (): Promise<AdminKPIData> => {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalPrograms } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true });

      const { count: totalCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      const { data: roleData } = await supabase
        .from('profiles')
        .select('role')
        .eq('is_active', true);

      const usersByRole: Record<string, number> = {};
      if (roleData) {
        for (const row of roleData) {
          usersByRole[row.role] = (usersByRole[row.role] ?? 0) + 1;
        }
      }

      return {
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        totalPrograms: totalPrograms ?? 0,
        totalCourses: totalCourses ?? 0,
        usersByRole,
      };
    },
    staleTime: 30_000,
  });
};

export const useRecentAuditLogs = (limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.auditLogs.list({ limit }),
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, performed_by, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as AuditLogEntry[];
    },
    staleTime: 30_000,
  });
};
