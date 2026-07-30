import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/types/database";

type TutorLog = Database["public"]["Tables"]["tutor_llm_logs"]["Row"];

export interface GovernanceModelUsage {
  model: string;
  requests: number;
  tokens: number;
}

export interface AIGovernanceUsage {
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  totalTokens: number;
  averageLatencyMs: number;
  models: GovernanceModelUsage[];
}

const currentMonthStart = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
};

export const aggregateGovernanceUsage = (
  rows: Pick<
    TutorLog,
    "model_used" | "total_tokens" | "latency_ms" | "status"
  >[]
): AIGovernanceUsage => {
  const successfulRequests = rows.filter(
    (row) => row.status.toLowerCase() === "success"
  ).length;
  const totalTokens = rows.reduce((sum, row) => sum + row.total_tokens, 0);
  const latencyTotal = rows.reduce((sum, row) => sum + row.latency_ms, 0);
  const byModel = new Map<string, GovernanceModelUsage>();

  for (const row of rows) {
    const current = byModel.get(row.model_used) ?? {
      model: row.model_used,
      requests: 0,
      tokens: 0,
    };
    current.requests += 1;
    current.tokens += row.total_tokens;
    byModel.set(row.model_used, current);
  }

  return {
    totalRequests: rows.length,
    successfulRequests,
    successRate:
      rows.length > 0
        ? Math.round((successfulRequests / rows.length) * 100)
        : 0,
    totalTokens,
    averageLatencyMs:
      rows.length > 0 ? Math.round(latencyTotal / rows.length) : 0,
    models: [...byModel.values()].sort(
      (left, right) => right.requests - left.requests
    ),
  };
};

export const useAIGovernanceUsage = (institutionId?: string) =>
  useQuery({
    queryKey: queryKeys.aiGovernance.detail(institutionId ?? ""),
    queryFn: async (): Promise<AIGovernanceUsage> => {
      const { data, error } = await supabase
        .from("tutor_llm_logs")
        .select("model_used, total_tokens, latency_ms, status")
        .eq("institution_id", institutionId!)
        .gte("created_at", currentMonthStart())
        .order("created_at", { ascending: false })
        .limit(2_000);

      if (error) throw error;
      return aggregateGovernanceUsage(data ?? []);
    },
    enabled: !!institutionId,
    staleTime: 60_000,
  });
