// Feature: Task 6.3 (edeviser-agentic-intelligence) — governance summary hook.
// Reads the bounded `get_governance_summary` channel of the agent-orchestrator
// edge function (admin role enforced server-side; institution-scoped 7-day
// aggregates). Response is untrusted — every field passes a guard.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";

export interface GovernanceSummary {
  readonly runsTotal: number;
  readonly runsFailed: number;
  readonly toolAttempts: number;
  readonly proposalsPending: number;
  readonly totalTokens: number;
}

const nonNegativeInt = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;

/** Untrusted envelope → validated summary; any malformed field zeroes it. */
const parseSummary = (value: unknown): GovernanceSummary | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = (value as { summary?: unknown }).summary;
  if (typeof record !== "object" || record === null) return null;
  const s = record as Record<string, unknown>;
  return {
    runsTotal: nonNegativeInt(s.runs_total),
    runsFailed: nonNegativeInt(s.runs_failed),
    toolAttempts: nonNegativeInt(s.tool_attempts),
    proposalsPending: nonNegativeInt(s.proposals_pending),
    totalTokens: nonNegativeInt(s.total_tokens),
  };
};

export const useGovernanceSummary = () => {
  const identity = useAiIdentity();
  return useQuery({
    // Institution/admin-scoped cache identity: institution + role + actor are
    // embedded so the global 30-min query cache can never serve a governance
    // snapshot across identity or institution transitions.
    queryKey: [
      "agent",
      "governance-summary",
      identity.institutionId,
      identity.role,
      identity.userId,
    ],
    queryFn: async (): Promise<GovernanceSummary | null> => {
      const { data, error } = await supabase.functions.invoke(
        "agent-orchestrator",
        { body: { action: "get_governance_summary" } }
      );
      if (error) return null;
      return parseSummary(data);
    },
    enabled: identity.ready,
    staleTime: 60_000,
    retry: false,
  });
};

