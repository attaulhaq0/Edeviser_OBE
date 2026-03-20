// =============================================================================
// useAIPerformance — TanStack Query hook for AI Co-Pilot performance metrics
// Validates: Requirements 49.5
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIPerformanceMetrics {
  suggestionAcceptanceRate: number; // 0–100
  predictionAccuracyRate: number;   // 0–100
  draftAcceptanceRate: number;      // 0–100
  suggestionTotal: number;
  predictionTotal: number;
  draftTotal: number;
}

// ─── useAIPerformance ────────────────────────────────────────────────────────

export const useAIPerformance = () => {
  return useQuery({
    queryKey: [...queryKeys.aiFeedback.lists(), 'performance'],
    queryFn: async (): Promise<AIPerformanceMetrics> => {
      // Suggestion acceptance: % of module_suggestion rows with feedback='thumbs_up'
      const { data: suggestions, error: sugErr } = await supabase
        .from('ai_feedback')
        .select('id, feedback')
        .eq('suggestion_type', 'module_suggestion');

      if (sugErr) throw sugErr;

      const suggestionTotal = suggestions?.length ?? 0;
      const thumbsUp = suggestions?.filter((r) => r.feedback === 'thumbs_up').length ?? 0;
      const suggestionAcceptanceRate = suggestionTotal > 0
        ? Math.round((thumbsUp / suggestionTotal) * 100)
        : 0;

      // Prediction accuracy: % of at_risk_prediction rows with validated_outcome='correct'
      const { data: predictions, error: predErr } = await supabase
        .from('ai_feedback')
        .select('id, validated_outcome')
        .eq('suggestion_type', 'at_risk_prediction')
        .not('validated_outcome', 'is', null);

      if (predErr) throw predErr;

      const predictionTotal = predictions?.length ?? 0;
      const correct = predictions?.filter((r) => r.validated_outcome === 'correct').length ?? 0;
      const predictionAccuracyRate = predictionTotal > 0
        ? Math.round((correct / predictionTotal) * 100)
        : 0;

      // Draft acceptance: % of feedback_draft rows with validated_outcome='accepted'
      const { data: drafts, error: draftErr } = await supabase
        .from('ai_feedback')
        .select('id, validated_outcome')
        .eq('suggestion_type', 'feedback_draft');

      if (draftErr) throw draftErr;

      const draftTotal = drafts?.length ?? 0;
      const accepted = drafts?.filter((r) => r.validated_outcome === 'accepted').length ?? 0;
      const draftAcceptanceRate = draftTotal > 0
        ? Math.round((accepted / draftTotal) * 100)
        : 0;

      return {
        suggestionAcceptanceRate,
        predictionAccuracyRate,
        draftAcceptanceRate,
        suggestionTotal,
        predictionTotal,
        draftTotal,
      };
    },
    staleTime: 30_000,
  });
};
