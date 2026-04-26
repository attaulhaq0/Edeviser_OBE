/**
 * Hook to fetch extra quiz attempt token usage for teacher quiz analytics.
 * Queries consumed xp_purchases with sub_category 'extra_quiz_attempt'
 * and joins profile data for display.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ExtraAttemptTokenUsageRow {
  id: string;
  student_id: string;
  student_name: string;
  consumed_at: string;
  xp_cost: number;
  quiz_id: string;
}

export const useExtraAttemptTokenUsage = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.extraAttemptUsage.byCourse(courseId ?? ''),
    queryFn: async (): Promise<ExtraAttemptTokenUsageRow[]> => {
      // Fetch consumed extra_quiz_attempt purchases for quizzes in this course.
      // We join marketplace_items to filter by sub_category and profiles for student names.
      const { data, error } = await supabase
        .from('xp_purchases')
        .select(
          'id, student_id, consumed_at, xp_cost, metadata, profiles!xp_purchases_student_id_fkey(full_name), marketplace_items!inner(sub_category)',
        )
        .eq('status', 'consumed')
        .eq('marketplace_items.sub_category', 'extra_quiz_attempt')
        .order('consumed_at', { ascending: false });

      if (error) throw error;

      // Filter to only purchases consumed for quizzes in this course.
      // The metadata contains { consumed_for_quiz: quizId }.
      // We need to cross-reference quiz_ids with the course.
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        student_id: string;
        consumed_at: string | null;
        xp_cost: number;
        metadata: { consumed_for_quiz?: string } | null;
        profiles: { full_name: string } | null;
        marketplace_items: { sub_category: string };
      }>;

      // Collect unique quiz IDs from metadata
      const quizIds = [
        ...new Set(
          rows
            .map((r) => r.metadata?.consumed_for_quiz)
            .filter((id): id is string => !!id),
        ),
      ];

      if (quizIds.length === 0) return [];

      // Fetch quizzes for this course to filter
      const { data: quizzes, error: quizErr } = await supabase
        .from('quizzes')
        .select('id')
        .eq('course_id', courseId!)
        .in('id', quizIds);

      if (quizErr) throw quizErr;

      const courseQuizIds = new Set((quizzes ?? []).map((q) => q.id));

      return rows
        .filter((r) => {
          const quizId = r.metadata?.consumed_for_quiz;
          return quizId && courseQuizIds.has(quizId);
        })
        .map((r) => ({
          id: r.id,
          student_id: r.student_id,
          student_name: r.profiles?.full_name ?? 'Unknown',
          consumed_at: r.consumed_at ?? '',
          xp_cost: r.xp_cost,
          quiz_id: r.metadata?.consumed_for_quiz ?? '',
        }));
    },
    enabled: !!courseId,
  });
};
