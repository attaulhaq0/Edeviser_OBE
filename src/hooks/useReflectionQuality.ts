import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ReflectionQualityScore, QualityCategory } from '@/types/planner';

interface ScoreResult {
  score: number;
  category: QualityCategory;
  suggestions: string[];
  flags: string[];
}

export const useScoreReflection = () => {
  return useMutation({
    mutationFn: async (input: {
      text: string;
      studentId: string;
      reflectionId: string;
      reflectionType: 'session_reflection' | 'journal_entry';
    }): Promise<ScoreResult> => {
      const { data, error } = await supabase.functions.invoke('score-reflection-quality', {
        body: {
          text: input.text,
          student_id: input.studentId,
          reflection_id: input.reflectionId,
          reflection_type: input.reflectionType,
        },
      });
      if (error) throw error;
      return data as ScoreResult;
    },
  });
};

export const useReflectionScore = (reflectionId: string, reflectionType: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reflectionQuality', reflectionId, reflectionType],
    queryFn: async (): Promise<ReflectionQualityScore | null> => {
      const { data, error } = await supabase
        .from('reflection_quality_scores')
        .select('*')
        .eq('reflection_id', reflectionId)
        .eq('reflection_type', reflectionType)
        .eq('student_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string,
        reflectionId: r.reflection_id as string,
        reflectionType: r.reflection_type as 'session_reflection' | 'journal_entry',
        studentId: r.student_id as string,
        score: r.score as number,
        originalityScore: r.originality_score as number,
        relevanceScore: r.relevance_score as number,
        depthScore: r.depth_score as number,
        flags: r.flags as string[],
        scoredAt: r.scored_at as string,
      };
    },
    enabled: !!user?.id && !!reflectionId,
  });
};
