// Feature: Task 3.4 — approval-inbox data layer (Wave D3).
// Lists pending agent_action_proposals via the agent-orchestrator's
// server-side `list_proposals` channel. agent_action_proposals is RLS-enabled
// with ZERO client policies by design (deny-all; service-role writes), so the
// browser CANNOT select from the table directly — this hook intentionally
// routes through the edge function, which re-verifies the caller's approver
// scope server-side before projecting rows. All client-side checks remain
// DISPLAY/HINT ONLY; authorization stays server-authoritative.

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import {
  parseAgentProposalView,
  type AgentRole,
} from "@/lib/agentProposals";

export interface AgentInboxEntry {
  readonly id: string;
  readonly actionType: string;
  readonly reason: string;
  readonly evidenceCount: number;
  readonly requiredApproverRole: AgentRole;
  readonly requiredApproverUserId?: string;
  readonly status: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
  /** Server-asserted: this proposal carries a protected (approval-required) action. */
  readonly riskProtected: boolean;
}

interface ListProposalsResponse {
  readonly proposals?: unknown;
}

const fetchInbox = async (): Promise<AgentInboxEntry[]> => {
  const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
    body: { action: "list_proposals" },
  });
  if (error) throw new Error("agent_inbox_unavailable");
  const rows = (data as ListProposalsResponse | null)?.proposals;
  if (!Array.isArray(rows)) return [];
  const entries: AgentInboxEntry[] = [];
  for (const row of rows) {
    // Untrusted edge payload: only schema-valid proposals are surfaced.
    const parsed = parseAgentProposalView(row);
    if (!parsed) continue;
    entries.push({
      ...parsed,
      status: String((row as { status?: unknown }).status ?? parsed.status),
      riskProtected:
        (row as { riskProtected?: unknown }).riskProtected === true,
    });
  }
  return entries;
};

/**
 * Pending proposals awaiting the viewer's decision. The server projects only
 * rows whose required_approver matches the authenticated caller, so entries
 * here are exactly the actionable set; local filtering is cosmetic.
 */
export const useAgentInbox = (role: AgentRole, userId: string) =>
  useQuery<AgentInboxEntry[], Error>({
    queryKey: ["agent-inbox", role, userId],
    queryFn: fetchInbox,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
