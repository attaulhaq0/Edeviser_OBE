import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { aiGovernanceSupabase } from "@/lib/aiGovernanceClient";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/types/database";
import {
  AI_GOVERNANCE_ACTION_POLICIES,
  autonomyRank,
  mergeInstitutionGovernancePolicies,
  type GovernanceActionPolicy,
  type GovernanceAutonomyLevel,
  type InstitutionGovernancePolicy,
} from "@/lib/aiGovernancePolicy";

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

export const useAIGovernancePolicies = (institutionId?: string | null) =>
  useQuery<InstitutionGovernancePolicy[]>({
    queryKey: queryKeys.aiGovernance.list({
      view: "policies",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!institutionId) throw new Error("Institution context is required");
      const { data, error } = await aiGovernanceSupabase
        .from("ai_governance_policies")
        .select("action_key, level, hard_cap, sensitive, updated_at")
        .eq("institution_id", institutionId)
        .returns<
          Array<{
            action_key: GovernanceActionPolicy["actionKey"];
            level: GovernanceAutonomyLevel;
            hard_cap: GovernanceAutonomyLevel | null;
            sensitive: boolean;
            updated_at: string | null;
          }>
        >();
      if (error) throw error;
      return mergeInstitutionGovernancePolicies(data ?? []);
    },
  });

export const useUpdateAIGovernancePolicy = (institutionId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      actionKey,
      level,
    }: {
      actionKey: GovernanceActionPolicy["actionKey"];
      level: GovernanceAutonomyLevel;
    }) => {
      if (!institutionId) throw new Error("Institution context is required");
      const platformPolicy = AI_GOVERNANCE_ACTION_POLICIES.find(
        (policy) => policy.actionKey === actionKey
      );
      if (!platformPolicy) throw new Error("Unknown AI governance action");
      if (
        platformPolicy.hardCap &&
        autonomyRank(level) > autonomyRank(platformPolicy.hardCap)
      ) {
        throw new Error(`${actionKey} cannot exceed ${platformPolicy.hardCap}`);
      }
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user)
        throw userError ?? new Error("Admin session is required");

      const { error } = await aiGovernanceSupabase
        .from("ai_governance_policies")
        .upsert(
          {
            institution_id: institutionId,
            action_key: actionKey,
            level,
            hard_cap: platformPolicy.hardCap,
            sensitive: platformPolicy.sensitive,
            updated_by: userData.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "institution_id,action_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.aiGovernance.list({
          view: "policies",
          institutionId: institutionId ?? null,
        }),
      });
    },
  });
};
