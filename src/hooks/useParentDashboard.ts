import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface LinkedChild {
  student_id: string;
  student_name: string;
  current_level: number;
  xp_total: number;
  current_streak: number;
  enrolled_courses: number;
  avg_attainment: number;
}

export interface ParentKPIData {
  linkedChildren: number;
  totalCourses: number;
  avgAttainment: number;
  upcomingDeadlines: number;
}

/**
 * Resolve the verified linked-child student IDs for a parent. RLS on
 * `parent_student_links` already restricts rows to the calling parent; the
 * explicit `verified = true` filter mirrors the parent-access policy scope so
 * unverified links never surface a child.
 */
const fetchVerifiedChildIds = async (parentId: string): Promise<string[]> => {
  const { data: links, error } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("verified", true);

  if (error) throw error;
  return (links ?? []).map((l) => l.student_id);
};

export const useLinkedChildren = (
  parentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.parentStudentLinks.list({ parentId }),
    queryFn: async (): Promise<LinkedChild[]> => {
      if (!parentId) return [];

      const studentIds = await fetchVerifiedChildIds(parentId);

      if (studentIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      if (profilesError) throw profilesError;
      const typedProfiles = profiles ?? [];

      // Batch fetch gamification for all children (1 query instead of N)
      const { data: gamData, error: gamError } = await supabase
        .from("student_gamification")
        .select("student_id, level, xp_total, streak_current")
        .in("student_id", studentIds);

      if (gamError) throw gamError;
      const gamMap = new Map((gamData ?? []).map((g) => [g.student_id, g]));

      // Batch fetch enrollment data for all children (1 query instead of N).
      // Reads `student_courses` — now visible to verified parents via RLS.
      const { data: enrollData, error: enrollError } = await supabase
        .from("student_courses")
        .select("student_id")
        .in("student_id", studentIds);

      if (enrollError) throw enrollError;

      const enrollCountMap = new Map<string, number>();
      for (const e of enrollData ?? []) {
        enrollCountMap.set(
          e.student_id,
          (enrollCountMap.get(e.student_id) ?? 0) + 1
        );
      }

      // Batch fetch course-scope attainment for all children (1 query). The
      // parent `outcome_attainment` policy already exposes these rows for
      // verified linked children; we average the per-course attainment.
      const { data: attainmentData, error: attainmentError } = await supabase
        .from("outcome_attainment")
        .select("student_id, attainment_percent")
        .in("student_id", studentIds)
        .eq("scope", "student_course");

      if (attainmentError) throw attainmentError;

      const attainmentMap = new Map<string, { sum: number; count: number }>();
      for (const row of attainmentData ?? []) {
        if (!row.student_id) continue;
        const cur = attainmentMap.get(row.student_id) ?? { sum: 0, count: 0 };
        cur.sum += row.attainment_percent;
        cur.count += 1;
        attainmentMap.set(row.student_id, cur);
      }

      // Map results back to each child
      const children: LinkedChild[] = typedProfiles.map((profile) => {
        const gam = gamMap.get(profile.id);
        const att = attainmentMap.get(profile.id);
        return {
          student_id: profile.id,
          student_name: profile.full_name ?? "Unknown",
          current_level: gam?.level ?? 1,
          xp_total: gam?.xp_total ?? 0,
          current_streak: gam?.streak_current ?? 0,
          enrolled_courses: enrollCountMap.get(profile.id) ?? 0,
          avg_attainment:
            att && att.count > 0 ? Math.round(att.sum / att.count) : 0,
        };
      });

      return children;
    },
    enabled: (options?.enabled ?? true) && !!parentId,
    staleTime: 60_000,
  });
};

export const useParentKPIs = (
  parentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.parentDashboard.detail(parentId ?? ""),
    queryFn: async (): Promise<ParentKPIData> => {
      const empty: ParentKPIData = {
        linkedChildren: 0,
        totalCourses: 0,
        avgAttainment: 0,
        upcomingDeadlines: 0,
      };

      if (!parentId) return empty;

      const studentIds = await fetchVerifiedChildIds(parentId);

      if (studentIds.length === 0) return empty;

      // Enrolled courses across all linked children (now-visible via parent
      // SELECT RLS on `student_courses`).
      const { data: enrollData, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id")
        .in("student_id", studentIds)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      const courseIds = Array.from(
        new Set(
          (enrollData ?? [])
            .map((e) => e.course_id)
            .filter((id): id is string => id !== null)
        )
      );

      // Average course-scope attainment across all children.
      const { data: attainmentData, error: attainmentError } = await supabase
        .from("outcome_attainment")
        .select("attainment_percent")
        .in("student_id", studentIds)
        .eq("scope", "student_course");

      if (attainmentError) throw attainmentError;

      const attainmentRows = attainmentData ?? [];
      const avgAttainment =
        attainmentRows.length > 0
          ? Math.round(
              attainmentRows.reduce((sum, r) => sum + r.attainment_percent, 0) /
                attainmentRows.length
            )
          : 0;

      // Upcoming assignment deadlines across enrolled courses.
      let upcomingDeadlines = 0;
      if (courseIds.length > 0) {
        const nowIso = new Date().toISOString();
        const { count, error: deadlinesError } = await supabase
          .from("assignments")
          .select("*", { count: "exact", head: true })
          .in("course_id", courseIds)
          .gte("due_date", nowIso);

        if (deadlinesError) throw deadlinesError;
        upcomingDeadlines = count ?? 0;
      }

      return {
        linkedChildren: studentIds.length,
        totalCourses: enrollData?.length ?? 0,
        avgAttainment,
        upcomingDeadlines,
      };
    },
    enabled: (options?.enabled ?? true) && !!parentId,
    staleTime: 60_000,
  });
};
