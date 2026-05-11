// =============================================================================
// useTeachingImpact — TanStack Query hook for teaching impact metrics
// Task 3.14: fetch teaching impact metrics (top peer teachers, most-viewed
//            moments, average ratings)
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopPeerTeacher {
  author_id: string;
  moment_count: number;
  total_views: number;
  avg_clarity: number;
  avg_helpfulness: number;
}

export interface MostViewedMoment {
  moment_id: string;
  title: string;
  author_id: string;
  clo_id: string;
  view_count: number;
  avg_clarity: number;
  avg_helpfulness: number;
}

export interface TeachingImpactMetrics {
  topTeachers: TopPeerTeacher[];
  mostViewedMoments: MostViewedMoment[];
  totalMoments: number;
  totalViews: number;
  averageClarity: number;
  averageHelpfulness: number;
}

// ─── useTeachingImpact ───────────────────────────────────────────────────────

export const useTeachingImpact = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.teachingImpact.list({ courseId }),
    queryFn: async (): Promise<TeachingImpactMetrics> => {
      // Get team IDs for this course
      const { data: teams, error: teamsError } = await supabase
        .from("teams" as never)
        .select("id")
        .eq("course_id", courseId!)
        .is("deleted_at", null);
      if (teamsError) throw teamsError;

      const teamIds = ((teams ?? []) as Array<{ id: string }>).map((t) => t.id);
      if (teamIds.length === 0) {
        return {
          topTeachers: [],
          mostViewedMoments: [],
          totalMoments: 0,
          totalViews: 0,
          averageClarity: 0,
          averageHelpfulness: 0,
        };
      }

      // Fetch all active teaching moments for these teams
      const { data: moments, error: momentsError } = await supabase
        .from("peer_teaching_moments" as never)
        .select("id, title, author_id, clo_id, team_id")
        .in("team_id", teamIds)
        .eq("status", "active");
      if (momentsError) throw momentsError;

      const momentList = (moments ?? []) as Array<{
        id: string;
        title: string;
        author_id: string;
        clo_id: string;
        team_id: string;
      }>;

      if (momentList.length === 0) {
        return {
          topTeachers: [],
          mostViewedMoments: [],
          totalMoments: 0,
          totalViews: 0,
          averageClarity: 0,
          averageHelpfulness: 0,
        };
      }

      const momentIds = momentList.map((m) => m.id);

      // Fetch views
      const { data: views, error: viewsError } = await supabase
        .from("teaching_moment_views" as never)
        .select("teaching_moment_id")
        .in("teaching_moment_id", momentIds);
      if (viewsError) throw viewsError;

      const viewCountMap = new Map<string, number>();
      for (const v of (views ?? []) as Array<{ teaching_moment_id: string }>) {
        viewCountMap.set(
          v.teaching_moment_id,
          (viewCountMap.get(v.teaching_moment_id) ?? 0) + 1
        );
      }

      // Fetch ratings
      const { data: ratings, error: ratingsError } = await supabase
        .from("teaching_moment_ratings" as never)
        .select("teaching_moment_id, clarity_rating, helpfulness_rating")
        .in("teaching_moment_id", momentIds);
      if (ratingsError) throw ratingsError;

      const ratingsList = (ratings ?? []) as Array<{
        teaching_moment_id: string;
        clarity_rating: number;
        helpfulness_rating: number;
      }>;

      // Compute per-moment average ratings
      const ratingsByMoment = new Map<
        string,
        { clarity: number[]; helpfulness: number[] }
      >();
      for (const r of ratingsList) {
        const existing = ratingsByMoment.get(r.teaching_moment_id) ?? {
          clarity: [],
          helpfulness: [],
        };
        existing.clarity.push(r.clarity_rating);
        existing.helpfulness.push(r.helpfulness_rating);
        ratingsByMoment.set(r.teaching_moment_id, existing);
      }

      const avg = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      // Build most-viewed moments (top 10)
      const mostViewedMoments: MostViewedMoment[] = momentList
        .map((m) => {
          const momentRatings = ratingsByMoment.get(m.id);
          return {
            moment_id: m.id,
            title: m.title,
            author_id: m.author_id,
            clo_id: m.clo_id,
            view_count: viewCountMap.get(m.id) ?? 0,
            avg_clarity: avg(momentRatings?.clarity ?? []),
            avg_helpfulness: avg(momentRatings?.helpfulness ?? []),
          };
        })
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 10);

      // Build top peer teachers (by total views, top 10)
      const teacherMap = new Map<
        string,
        {
          moments: string[];
          views: number;
          clarity: number[];
          helpfulness: number[];
        }
      >();
      for (const m of momentList) {
        const existing = teacherMap.get(m.author_id) ?? {
          moments: [],
          views: 0,
          clarity: [],
          helpfulness: [],
        };
        existing.moments.push(m.id);
        existing.views += viewCountMap.get(m.id) ?? 0;
        const momentRatings = ratingsByMoment.get(m.id);
        if (momentRatings) {
          existing.clarity.push(...momentRatings.clarity);
          existing.helpfulness.push(...momentRatings.helpfulness);
        }
        teacherMap.set(m.author_id, existing);
      }

      const topTeachers: TopPeerTeacher[] = Array.from(teacherMap.entries())
        .map(([authorId, data]) => ({
          author_id: authorId,
          moment_count: data.moments.length,
          total_views: data.views,
          avg_clarity: avg(data.clarity),
          avg_helpfulness: avg(data.helpfulness),
        }))
        .sort((a, b) => b.total_views - a.total_views)
        .slice(0, 10);

      // Global averages
      const allClarity = ratingsList.map((r) => r.clarity_rating);
      const allHelpfulness = ratingsList.map((r) => r.helpfulness_rating);

      return {
        topTeachers,
        mostViewedMoments,
        totalMoments: momentList.length,
        totalViews: (views ?? []).length,
        averageClarity: avg(allClarity),
        averageHelpfulness: avg(allHelpfulness),
      };
    },
    enabled: !!courseId,
  });
};
