// Feature: Agent task inbox (tasks.md 3.1 AgentTaskInbox + 3.4 — Wave D).
// TanStack Query hook over the agent-orchestrator `list_proposals` channel.
//
// LIVE-DB CONTRACT (verified via MCP pg_policies 2026-08-28): the
// agent_action_proposals table is RLS-deny-all for clients by design, so the
// inbox flows through the orchestrator edge function (service-role server
// side), which re-checks institution + approver scope per row. The client
// validates every row with parseAgentProposalView and drops invalid entries —
// fail-closed: a malformed row can never render.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  parseAgentProposalView,
  type AgentProposalView,
} from "@/lib/agentProposals";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProposalInboxScope = "pending" | "all";

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Proposals addressed to the authenticated actor's approver role within their
 * institution. Server-authoritative: the orchestrator filters by institution
 * and approver eligibility; the client only parses and renders.
 */
export const useProposalInbox = (scope: ProposalInboxScope = "pending") =>
  useQuery<readonly AgentProposalView[]>({
    queryKey: ["ai", "proposal-inbox", scope],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "agent-orchestrator",
        {
          body: {
            action: "list_proposals",
            ...(scope === "pending" ? { status: "pending" } : {}),
          },
        }
      );
      if (error) {
        throw new Error("Proposal inbox is unavailable");
      }
      const rows = (data as { proposals?: unknown } | null)?.proposals;
      if (!Array.isArray(rows)) return [];
      return rows
        .map((row) => parseAgentProposalView(row as unknown))
        .filter((view): view is AgentProposalView => view !== null);
    },
    staleTime: 30_000,
  });
