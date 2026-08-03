// =============================================================================
// useCoordinatorAiInsights — AI attainment insight for the coordinator
// =============================================================================
//
// Calls the `coordinator-ai-insights` Edge Function, which returns a real
// rule-based attainment insight (optionally LLM-enhanced when a GEMINI_API_KEY
// is configured server-side). This hook is ADDITIVE and fails soft: if the
// function is not deployed yet, errors, or the caller has no institution, it
// returns `null` so consuming screens simply fall back to their own computed
// insight instead of showing an error. No writes from the client.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface CoordinatorAiInsight {
  threshold: number;
  ploCount: number;
  avgAttainment: number | null;
  belowTargetCount: number;
  weakest: {
    ploTitle: string;
    cloTitle: string | null;
    attainment: number;
  } | null;
  narrative: string;
  recommendations: string[];
  source: "ai" | "computed";
  model: string | null;
  generatedAt: string;
  cached?: boolean;
}

export const useCoordinatorAiInsights = (institutionId?: string | null) => {
  // The source function is intentionally opt-in until its deployed version is
  // present in the target Supabase project. This prevents a missing function
  // from producing noisy CORS/404 errors in production and keeps the dashboard
  // on its deterministic live-data cards. Enable after deploying the local
  // function with VITE_COORDINATOR_AI_INSIGHTS_ENABLED=true.
  const functionEnabled =
    import.meta.env.VITE_COORDINATOR_AI_INSIGHTS_ENABLED === "true";

  return useQuery({
    queryKey: queryKeys.aiSuggestions.list({
      view: "coordinatorInsights",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId && functionEnabled,
    // Insights are cached server-side (6h); avoid hammering the function.
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<CoordinatorAiInsight | null> => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "coordinator-ai-insights",
          { body: { kind: "attainment" } }
        );
        if (error || !data) return null;
        if ((data as { error?: string }).error) return null;
        return data as CoordinatorAiInsight;
      } catch {
        // Function not deployed / network failure → graceful (no AI card).
        return null;
      }
    },
  });
};
