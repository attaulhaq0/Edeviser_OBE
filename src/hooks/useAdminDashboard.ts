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
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalPrograms },
        { count: totalCourses },
        { data: roleData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('programs').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('role').eq('is_active', true),
      ]);

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
      const [
        { count: totalStudents },
        { count: completedOnboarding },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('is_active', true),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('is_active', true)
          .eq('onboarding_completed', true),
      ]);

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


// ── Department Analytics ─────────────────────────────────────────────────────

export interface DepartmentAttainment {
  department_id: string;
  department_name: string;
  avg_plo_attainment: number;
  avg_ilo_attainment: number;
  program_count: number;
}

export const useDepartmentAnalytics = () => {
  return useQuery({
    queryKey: [...queryKeys.adminDashboard.lists(), 'department-analytics'],
    queryFn: async (): Promise<DepartmentAttainment[]> => {
      // Execute all independent queries concurrently to prevent waterfall
      const [
        { data: departments, error: deptError },
        { data: programs, error: progError },
        { data: attainments, error: attError },
        { data: outcomes, error: outError },
      ] = await Promise.all([
        supabase.from('departments').select('id, name').order('name', { ascending: true }),
        supabase.from('programs').select('id, department_id').eq('is_active', true),
        supabase.from('outcome_attainment').select('outcome_id, attainment_percent, scope').in('scope', ['program', 'institution']),
        supabase.from('learning_outcomes').select('id, type, program_id, institution_id').in('type', ['PLO', 'ILO']),
      ]);

      if (deptError) throw deptError;
      if (progError) throw progError;
      if (attError) throw attError;
      if (outError) throw outError;

      if (!departments || departments.length === 0) return [];

      const outcomeMap = new Map((outcomes ?? []).map((o) => [o.id, o]));
      const programDeptMap = new Map((programs ?? []).map((p) => [p.id, p.department_id]));

      // Aggregate per department
      const deptStats = new Map<string, { ploScores: number[]; iloScores: number[]; programIds: Set<string> }>();
      for (const dept of departments) {
        deptStats.set(dept.id, { ploScores: [], iloScores: [], programIds: new Set() });
      }

      // Count programs per department
      for (const prog of programs ?? []) {
        if (prog.department_id) {
          deptStats.get(prog.department_id)?.programIds.add(prog.id);
        }
      }

      // Aggregate attainment scores
      for (const att of attainments ?? []) {
        const outcome = outcomeMap.get(att.outcome_id);
        if (!outcome || att.attainment_percent == null) continue;

        if (outcome.type === 'PLO' && outcome.program_id) {
          const deptId = programDeptMap.get(outcome.program_id);
          if (deptId && deptStats.has(deptId)) {
            deptStats.get(deptId)!.ploScores.push(att.attainment_percent);
          }
        }
        // ILO attainment is institution-wide, distribute to all departments
        if (outcome.type === 'ILO') {
          for (const [, stats] of deptStats) {
            stats.iloScores.push(att.attainment_percent);
          }
        }
      }

      const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

      return departments.map((dept) => {
        const stats = deptStats.get(dept.id)!;
        return {
          department_id: dept.id,
          department_name: dept.name,
          avg_plo_attainment: avg(stats.ploScores),
          avg_ilo_attainment: avg(stats.iloScores),
          program_count: stats.programIds.size,
        };
      });
    },
    staleTime: 60_000,
  });
};
