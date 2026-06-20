import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";

export interface StudentKPIData {
  enrolledCourses: number;
  completedAssignments: number;
  avgAttainment: number;
  currentStreak: number;
  currentLevel: number;
  totalXP: number;
  totalActiveDays: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
}

export const useStudentKPIs = (
  studentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.detail(studentId ?? ""),
    queryFn: async (): Promise<StudentKPIData> => {
      if (!studentId) {
        return {
          enrolledCourses: 0,
          completedAssignments: 0,
          avgAttainment: 0,
          currentStreak: 0,
          currentLevel: 1,
          totalXP: 0,
          totalActiveDays: 0,
        };
      }

      // ⚡ Bolt: Batch independent queries to reduce total latency.
      // Expected impact: Reduces TTI (Time to Interactive) for the dashboard by parallelizing the network requests.
      const [
        { count: enrolledCourses },
        { count: completedAssignments },
        { data: attainmentData },
        { data: gamification },
      ] = await Promise.all([
        supabase
          .from("student_courses")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentId),
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("status", "graded"),
        supabase
          .from("outcome_attainment")
          .select("attainment_percent")
          .eq("student_id", studentId)
          .eq("scope", "student_course"),
        supabase
          .from("student_gamification")
          .select("streak_current, level, xp_total, total_active_days")
          .eq("student_id", studentId)
          .maybeSingle(),
      ]);

      const typedAttainment = attainmentData ?? [];
      const avgAttainment =
        typedAttainment.length > 0
          ? Math.round(
              typedAttainment.reduce(
                (sum, a) => sum + a.attainment_percent,
                0
              ) / typedAttainment.length
            )
          : 0;

      const gamRow = gamification;

      return {
        enrolledCourses: enrolledCourses ?? 0,
        completedAssignments: completedAssignments ?? 0,
        avgAttainment,
        currentStreak: gamRow?.streak_current ?? 0,
        currentLevel: gamRow?.level ?? 1,
        totalXP: gamRow?.xp_total ?? 0,
        totalActiveDays: gamRow?.total_active_days ?? 0,
      };
    },
    enabled: !!studentId && (options?.enabled ?? true),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};

export const useUpcomingDeadlines = (
  studentId: string | undefined,
  limit: number = 5,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({ studentId, upcoming: true, limit }),
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      if (!studentId) return [];

      const { data: enrollments } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId);

      const courseIds = (enrollments ?? []).map((e) => e.course_id);

      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, course_id, due_date, courses(name)")
        .in("course_id", courseIds)
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        course_name:
          (a.courses as { name: string } | null)?.name ?? a.course_id,
        due_date: a.due_date,
      }));
    },
    enabled: !!studentId && (options?.enabled ?? true),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
