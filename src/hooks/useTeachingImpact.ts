// =============================================================================
// useTeachingImpact — Task 3.14
// Fetch teaching impact metrics (top peer teachers, most-viewed moments, average ratings)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeachingImpactMetric {
  author_id: string;
  author_name: string;
  total_moments: number;
  total_views: number;
  avg_clarity: number;
  avg_helpfulness: number;
}

export interface TopTeachingMoment {
  id: string;
  title: string;
  author_name: string;
  clo_name: string;
  view_count: number;
  avg_clarity: number;
  avg_helpfulness: number;
}

export const useTeachingImpact = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teachingImpact.list({ courseId }),
    queryFn: async (): Promise<{
      topTeachers: TeachingImpactMetric[];
      topMoments: TopTeachingMoment[];
    }> => {
      // Get all teams in the course
      const { data: teams } = await supabase
        .from('teams' as never)
        .select('id')
        .eq('course_id', courseId!)
        .is('deleted_at', null);

      if (!teams || teams.length === 0) {
        return { topTeachers: [], topMoments: [] };
      }

      const teamIds = (teams as Array<{ id: string }>).map((t) => t.id);

      // Get all teaching moments for these teams
      const { data: moments, error } = await supabase
        .from('peer_teaching_moments' as never)
        .select('id, author_id, title, clo_id, profiles!inner(full_name), clos!inner(title)')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (error) throw error;
      if (!moments || moments.length === 0) {
        return { topTeachers: [], topMoments: [] };
      }

      const momentIds = (moments as Array<{ id: string }>).map((m) => m.id);

      // Get view counts
      const { data: views } = await supabase
        .from('teaching_moment_views' as never)
        .select('teaching_moment_id')
        .in('teaching_moment_id', momentIds);

      const viewCountMap = new Map<string, number>();
      for (const v of (views ?? []) as Array<{ teaching_moment_id: string }>) {
        viewCountMap.set(v.teaching_moment_id, (viewCountMap.get(v.teaching_moment_id) ?? 0) + 1);
      }

      // Get ratings
      const { data: ratings } = await supabase
        .from('teaching_moment_ratings' as never)
        .select('teaching_moment_id, clarity_rating, helpfulness_rating')
        .in('teaching_moment_id', momentIds);

      const ratingMap = new Map<string, { clarity: number[]; helpfulness: number[] }>();
      for (const r of (ratings ?? []) as Array<{
        teaching_moment_id: string;
        clarity_rating: number;
        helpfulness_rating: number;
      }>) {
        const existing = ratingMap.get(r.teaching_moment_id) ?? { clarity: [], helpfulness: [] };
        existing.clarity.push(r.clarity_rating);
        existing.helpfulness.push(r.helpfulness_rating);
        ratingMap.set(r.teaching_moment_id, existing);
      }

      const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

      // Build top moments
      const topMoments: TopTeachingMoment[] = (moments as Array<Record<string, unknown>>)
        .map((m) => {
          const r = ratingMap.get(m.id as string);
          return {
            id: m.id as string,
            title: m.title as string,
            author_name: (m.profiles as Record<string, unknown>)?.full_name as string,
            clo_name: (m.clos as Record<string, unknown>)?.title as string,
            view_count: viewCountMap.get(m.id as string) ?? 0,
            avg_clarity: Math.round(avg(r?.clarity ?? []) * 10) / 10,
            avg_helpfulness: Math.round(avg(r?.helpfulness ?? []) * 10) / 10,
          };
        })
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 10);

      // Build top teachers (aggregate by author)
      const teacherMap = new Map<string, TeachingImpactMetric>();
      for (const m of moments as Array<Record<string, unknown>>) {
        const authorId = m.author_id as string;
        const existing = teacherMap.get(authorId) ?? {
          author_id: authorId,
          author_name: (m.profiles as Record<string, unknown>)?.full_name as string,
          total_moments: 0,
          total_views: 0,
          avg_clarity: 0,
          avg_helpfulness: 0,
        };
        existing.total_moments++;
        existing.total_views += viewCountMap.get(m.id as string) ?? 0;
        teacherMap.set(authorId, existing);
      }

      const topTeachers = [...teacherMap.values()]
        .sort((a, b) => b.total_views - a.total_views)
        .slice(0, 10);

      return { topTeachers, topMoments };
    },
    enabled: !!courseId,
  });
};
