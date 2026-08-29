// Feature: Proactive suggestions surface (tasks.md 3.5 — Wave D).
// TanStack Query hook over the sanctioned `get_my_proactive_intelligence_v1`
// SECURITY DEFINER RPC. Authorization lives in the RPC (actor + role +
// institution re-checked per row); the client only validates shapes and
// renders. Fail-closed: invalid rows are skipped, errors surface as a query
// error the caller must render as "unavailable", never as fabricated data.

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

/** One completed proactive job addressed to the authenticated actor. */
export interface ProactiveSuggestion {
  readonly id: string;
  readonly recipientRole: string;
  readonly specialist: string;
  readonly studentId?: string;
  readonly courseId?: string;
  readonly programId?: string;
  readonly triggerKey: string;
  /** Deterministic evidence packet accompanying the recommendation. */
  readonly evidencePacket: Record<string, unknown>;
  readonly recommendation: string;
  /** Proposals awaiting THIS actor's decision for the originating run. */
  readonly pendingProposals: readonly {
    readonly id: string;
    readonly actionType: string;
    readonly status: string;
    readonly requiredApproverRole: string;
  }[];
  readonly completedAt: string;
}

const proposalShape = z.object({
  id: z.string().uuid(),
  actionType: z.string().min(1),
  status: z.string().min(1),
  requiredApproverRole: z.string().min(1),
});

const suggestionShape = z.object({
  id: z.string().uuid(),
  recipient_role: z.string().min(1),
  specialist: z.string().min(1),
  student_id: z.string().uuid().nullish(),
  course_id: z.string().uuid().nullish(),
  program_id: z.string().uuid().nullish(),
  trigger_key: z.string().min(1),
  evidence_packet: z.record(z.string(), z.unknown()),
  recommendation: z.string().min(1),
  proposals: z.array(proposalShape),
  completed_at: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
});

const parseSuggestion = (value: unknown): ProactiveSuggestion | null => {
  const result = suggestionShape.safeParse(value);
  if (!result.success) return null;
  const row = result.data;
  return {
    id: row.id,
    recipientRole: row.recipient_role,
    specialist: row.specialist,
    studentId: row.student_id ?? undefined,
    courseId: row.course_id ?? undefined,
    programId: row.program_id ?? undefined,
    triggerKey: row.trigger_key,
    evidencePacket: row.evidence_packet,
    recommendation: row.recommendation,
    pendingProposals: row.proposals,
    completedAt: row.completed_at,
  };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Actor-scoped proactive intelligence feed. Empty when the institution has no
 * completed proactive jobs — which is the fail-closed behavior of the feature
 * flag (generation only runs for enabled institutions), so no extra client
 * gating is needed and none would be safe anyway.
 */
export const useProactiveSuggestions = (limit = 10) =>
  useQuery<readonly ProactiveSuggestion[]>({
    queryKey: ["proactive-suggestions", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_proactive_intelligence_v1",
        { p_limit: Math.min(Math.max(limit, 1), 50) }
      );
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows
        .map((row) => parseSuggestion(row as unknown))
        .filter((item): item is ProactiveSuggestion => item !== null);
    },
    staleTime: 60_000,
  });
