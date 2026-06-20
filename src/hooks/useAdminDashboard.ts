import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";

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
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("programs").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("role").eq("is_active", true),
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
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};

export const useRecentAuditLogs = (
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.auditLogs.list({ limit }),
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as AuditLogEntry[];
    },
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  });
};

// ── Onboarding Analytics ─────────────────────────────────────────────────────

export interface OnboardingAnalytics {
  totalStudents: number;
  completedOnboarding: number;
  completionRate: number;
}

export const useOnboardingAnalytics = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.adminDashboard.lists(), "onboarding"],
    queryFn: async (): Promise<OnboardingAnalytics> => {
      const [{ count: totalStudents }, { count: completedOnboarding }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student")
            .eq("is_active", true),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student")
            .eq("is_active", true)
            .eq("onboarding_completed", true),
        ]);

      const total = totalStudents ?? 0;
      const completed = completedOnboarding ?? 0;
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        totalStudents: total,
        completedOnboarding: completed,
        completionRate,
      };
    },
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
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
    queryKey: [
      ...queryKeys.adminDashboard.lists(),
      "pending-onboarding",
      filters,
    ],
    queryFn: async (): Promise<PendingOnboardingStudent[]> => {
      // When a program filter is supplied, restrict to students enrolled in a
      // course belonging to that program (profiles relate to programs via
      // student_courses → courses.program_id). Resolve those student ids first.
      let programStudentIds: string[] | null = null;
      if (filters?.programId) {
        const { data: programCourses, error: coursesError } = await supabase
          .from("courses")
          .select("id")
          .eq("program_id", filters.programId);
        if (coursesError) throw coursesError;

        const courseIds = (programCourses ?? []).map((c) => c.id);
        if (courseIds.length === 0) return [];

        const { data: enrollments, error: enrollError } = await supabase
          .from("student_courses")
          .select("student_id")
          .in("course_id", courseIds);
        if (enrollError) throw enrollError;

        programStudentIds = [
          ...new Set((enrollments ?? []).map((e) => e.student_id)),
        ];
        if (programStudentIds.length === 0) return [];
      }

      let query = supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("role", "student")
        .eq("is_active", true)
        .eq("onboarding_completed", false)
        .order("created_at", { ascending: false });

      if (programStudentIds) {
        query = query.in("id", programStudentIds);
      }

      if (filters?.enrolledAfter) {
        query = query.gte("created_at", filters.enrolledAfter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PendingOnboardingStudent[];
    },
    staleTime: DASHBOARD_STALE_TIME_MS,
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
    queryKey: [...queryKeys.adminDashboard.lists(), "department-analytics"],
    queryFn: async (): Promise<DepartmentAttainment[]> => {
      // Fetch departments
      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true });
      if (deptError) throw deptError;
      if (!departments || departments.length === 0) return [];

      // Fetch programs, attainments, and outcomes in parallel
      const [
        { data: programs, error: progError },
        { data: attainments, error: attError },
        { data: outcomes, error: outError },
      ] = await Promise.all([
        supabase
          .from("programs")
          .select("id, department_id")
          .eq("is_active", true),
        supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent, scope")
          .in("scope", ["program", "institution"]),
        supabase
          .from("learning_outcomes")
          .select("id, type, program_id, institution_id")
          .in("type", ["PLO", "ILO"]),
      ]);
      if (progError) throw progError;
      if (attError) throw attError;
      if (outError) throw outError;

      const outcomeMap = new Map((outcomes ?? []).map((o) => [o.id, o]));
      const programDeptMap = new Map(
        (programs ?? []).map((p) => [p.id, p.department_id])
      );

      // Aggregate per department
      const deptStats = new Map<
        string,
        { ploScores: number[]; programIds: Set<string> }
      >();
      for (const dept of departments) {
        deptStats.set(dept.id, {
          ploScores: [],
          programIds: new Set(),
        });
      }

      // Count programs per department
      for (const prog of programs ?? []) {
        if (prog.department_id) {
          deptStats.get(prog.department_id)?.programIds.add(prog.id);
        }
      }

      // Aggregate attainment scores
      const globalIloScores: number[] = [];
      for (const att of attainments ?? []) {
        const outcome = outcomeMap.get(att.outcome_id);
        if (!outcome || att.attainment_percent == null) continue;

        if (outcome.type === "PLO" && outcome.program_id) {
          const deptId = programDeptMap.get(outcome.program_id);
          if (deptId && deptStats.has(deptId)) {
            deptStats.get(deptId)!.ploScores.push(att.attainment_percent);
          }
        }
        // ILO attainment is institution-wide, collect globally
        if (outcome.type === "ILO") {
          globalIloScores.push(att.attainment_percent);
        }
      }

      const avg = (arr: number[]) =>
        arr.length > 0
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : 0;

      const avgGlobalIlo = avg(globalIloScores);

      return departments.map((dept) => {
        const stats = deptStats.get(dept.id)!;
        return {
          department_id: dept.id,
          department_name: dept.name,
          avg_plo_attainment: avg(stats.ploScores),
          avg_ilo_attainment: avgGlobalIlo,
          program_count: stats.programIds.size,
        };
      });
    },
    staleTime: 60_000,
  });
};
