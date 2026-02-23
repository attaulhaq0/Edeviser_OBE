import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

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
    queryKey: ['parent', 'linkedChildren', parentId],
    queryFn: async (): Promise<LinkedChild[]> => {
      if (!parentId) return [];

      const { data: links, error } = await db
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_id', parentId)
        .eq('verified', true);

      if (error) throw error;

      const studentIds = ((links ?? []) as Array<{ student_id: string }>).map(
        (l) => l.student_id,
      );

      if (studentIds.length === 0) return [];

      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const typedProfiles = (profiles ?? []) as Array<{ id: string; full_name: string }>;

      const children: LinkedChild[] = [];

      for (const profile of typedProfiles) {
        const { data: gam } = await db
          .from('student_gamification')
          .select('current_level, xp_total, current_streak')
          .eq('student_id', profile.id)
          .maybeSingle();

        const gamData = gam as {
          current_level: number;
          xp_total: number;
          current_streak: number;
        } | null;

        const { count: enrolledCourses } = await db
          .from('student_courses')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', profile.id);

        children.push({
          student_id: profile.id,
          student_name: profile.full_name ?? 'Unknown',
          current_level: gamData?.current_level ?? 1,
          xp_total: gamData?.xp_total ?? 0,
          current_streak: gamData?.current_streak ?? 0,
          enrolled_courses: enrolledCourses ?? 0,
          avg_attainment: 0,
        });
      }

      return children;
    },
    enabled: !!parentId,
    staleTime: 60_000,
  });
};

export const useParentKPIs = (parentId: string | undefined) => {
  return useQuery({
    queryKey: ['parent', 'kpis', parentId],
    queryFn: async (): Promise<ParentKPIData> => {
      if (!parentId) {
        return { linkedChildren: 0, totalCourses: 0, avgAttainment: 0, upcomingDeadlines: 0 };
      }

      const { count: linkedChildren } = await db
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
