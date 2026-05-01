// =============================================================================
// useReflectionQuality — Score reflections via Edge Function, fetch scores
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { getQualityCategory, calculateReflectionXP } from "@/lib/plannerUtils";
import type { ReflectionQualityScore, QualityCategory } from "@/types/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapQualityScore(row: Record<string, unknown>): ReflectionQualityScore {
  return {
    id: row.id as string,
    reflectionId: row.reflection_id as string,
    reflectionType:
      row.reflection_type as ReflectionQualityScore["reflectionType"],
    studentId: row.student_id as string,
    score: row.score as number,
    originalityScore: row.originality_score as number,
    relevanceScore: row.relevance_score as number,
    depthScore: row.depth_score as number,
    flags: (row.flags as string[]) ?? [],
    scoredAt: (row.scored_at as string) ?? "",
  };
}

// ─── useReflectionScore — fetch quality score for a reflection ───────────────

export const useReflectionScore = (reflectionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.journal.detail(reflectionId ?? ""),
    enabled: !!reflectionId && !!user,
    queryFn: async (): Promise<ReflectionQualityScore | null> => {
      if (!reflectionId || !user) return null;

      const { data, error } = await supabase
        .from("reflection_quality_scores")
        .select("*")
        .eq("reflection_id", reflectionId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapQualityScore(data as Record<string, unknown>);
    },
  });
};

// ─── useScoreReflection — trigger quality scoring via Edge Function ──────────

export const useScoreReflection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      reflectionId: string;
      reflectionType: "session_reflection" | "journal_entry";
      content: string;
    }): Promise<{
      score: ReflectionQualityScore;
      category: QualityCategory;
      suggestions: string[];
      xpAdjustment: number;
    }> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke(
        "score-reflection-quality",
        {
          body: {
            reflection_id: input.reflectionId,
            reflection_type: input.reflectionType,
            student_id: user.id,
            content: input.content,
          },
        }
      );

      if (error) throw error;

      const result = data as Record<string, unknown>;
      const score = mapQualityScore(result.score as Record<string, unknown>);
      const category = getQualityCategory(score.score);
      const suggestions = (result.suggestions as string[]) ?? [];

      // Calculate XP adjustment based on quality
      const baseXP = input.reflectionType === "journal_entry" ? 20 : 10;
      const xpAdjustment = calculateReflectionXP(
        baseXP,
        score.score,
        score.relevanceScore,
        score.depthScore,
        input.reflectionType === "journal_entry"
      );

      return { score, category, suggestions, xpAdjustment };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
    },
  });
};

// ─── useQualityCategory — convenience hook for category from score ───────────

export const useQualityCategory = (
  score: number | null | undefined
): QualityCategory => {
  return getQualityCategory(score ?? null);
};
