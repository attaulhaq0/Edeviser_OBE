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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as AuditLogEntry[];
    },
    staleTime: 30_000,
  });
};


// ── Onboarding Analytics ─────────────────────────────────────────────────────

export interface OnboardingAnalytics {
  totalStudents: number;
  completedOnboarding: number;
  completionRate: number;
}

export const useOnboardingAnalytics = () => {
  return useQuery({
    queryKey: [...queryKeys.adminDashboard.lists(), 'onboarding'],
    queryFn: async (): Promise<OnboardingAnalytics> => {
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true);

      const { count: completedOnboarding } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true)
        .eq('onboarding_completed', true);

      const total = totalStudents ?? 0;
      const completed = completedOnboarding ?? 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { totalStudents: total, completedOnboarding: completed, completionRate };
    },
    staleTime: 30_000,
  });
};

export interface PendingOnboardingStudent {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  program_name?: string;
}

export const usePendingOnboardingStudents = (filters?: {
  programId?: string;
  enrolledAfter?: string;
}) => {
  return useQuery({
    queryKey: [...queryKeys.adminDashboard.lists(), 'pending-onboarding', filters],
    queryFn: async (): Promise<PendingOnboardingStudent[]> => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'student')
        .eq('is_active', true)
        .eq('onboarding_completed', false)
        .order('created_at', { ascending: false });

      if (filters?.enrolledAfter) {
        query = query.gte('created_at', filters.enrolledAfter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PendingOnboardingStudent[];
    },
    staleTime: 30_000,
  });
};
