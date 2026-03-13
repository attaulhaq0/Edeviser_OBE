import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

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

export const useLinkedChildren = (parentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.parentStudentLinks.list({ parentId }),
    queryFn: async (): Promise<LinkedChild[]> => {
      if (!parentId) return [];

      const { data: links, error } = await supabase
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_id', parentId)
        .eq('verified', true);

      if (error) throw error;

      const studentIds = (links ?? []).map(
        (l) => l.student_id,
      );

      if (studentIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const typedProfiles = profiles ?? [];

      // Batch fetch gamification for all children (1 query instead of N)
      const { data: gamData } = await supabase
        .from('student_gamification')
        .select('student_id, level, xp_total, streak_current')
        .in('student_id', studentIds);

      const gamMap = new Map(
        (gamData ?? []).map((g) => [g.student_id, g]),
      );

      // Batch fetch enrollment data for all children (1 query instead of N)
      const { data: enrollData } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('student_id', studentIds);

      const enrollCountMap = new Map<string, number>();
      for (const e of enrollData ?? []) {
        enrollCountMap.set(e.student_id, (enrollCountMap.get(e.student_id) ?? 0) + 1);
      }

      // Map results back to each child
      const children: LinkedChild[] = typedProfiles.map((profile) => {
        const gam = gamMap.get(profile.id);
        return {
          student_id: profile.id,
          student_name: profile.full_name ?? 'Unknown',
          current_level: gam?.level ?? 1,
          xp_total: gam?.xp_total ?? 0,
          current_streak: gam?.streak_current ?? 0,
          enrolled_courses: enrollCountMap.get(profile.id) ?? 0,
          avg_attainment: 0,
        };
      });

      return children;
    },
    enabled: !!parentId,
    staleTime: 60_000,
  });
};

export const useParentKPIs = (parentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.parentDashboard.detail(parentId ?? ''),
    queryFn: async (): Promise<ParentKPIData> => {
      if (!parentId) {
        return { linkedChildren: 0, totalCourses: 0, avgAttainment: 0, upcomingDeadlines: 0 };
      }

      const { count: linkedChildren } = await supabase
        .from('parent_student_links')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('verified', true);

      return {
        linkedChildren: linkedChildren ?? 0,
        totalCourses: 0,
        avgAttainment: 0,
        upcomingDeadlines: 0,
      };
    },
    enabled: !!parentId,
    staleTime: 60_000,
  });
};
