// Feature: Agent feedback capture (tasks.md 3.1 AgentFeedbackControls — Wave D).
// TanStack Query mutation inserting into `agent_feedback` (author-scoped RLS:
// clients may insert their own rows; reads are author + admin only).
//
// LIVE-DB CONTRACT (migration 20260831000002, verified via MCP 2026-08-28):
// - rating integer CHECK (rating BETWEEN 1 AND 5)
// - comment text nullable, categories jsonb object
// - run_id / message_id optional FKs; institution_id + user_id required.
// TENANT BINDING (Wave D review, migration 20260901000001): run_id is bound
// to the feedback row's institution by a composite FK — agent_runs is
// RLS-deny-all to clients, so the DB is the only layer able to enforce it.
// message_id is verified HERE against the caller's institution (agent_messages
// is conversation-scoped readable under RLS), rejecting cross-tenant links
// before the insert.
// The edge/backend does NOT need this event — it is a pure quality signal.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentFeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface SubmitAgentFeedbackInput {
  readonly rating: AgentFeedbackRating;
  /** Optional free-text remark (trimmed server-side; bounded client-side). */
  readonly comment?: string;
  /** Link the rating to a specific orchestrator run. */
  readonly runId?: string;
  /** Link the rating to a specific conversation message. */
  readonly messageId?: string;
  /** Structured categories, e.g. { accuracy: true, tone: false }. */
  readonly categories?: Readonly<Record<string, boolean>>;
}

export interface AgentFeedbackReceipt {
  readonly id: string;
}

const feedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  runId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  categories: z.record(z.string(), z.boolean()).optional(),
});

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Submit a 1–5 rating (+ optional comment/categories) about an agent run or
 * message. The authenticated user's institution_id/user_id are resolved by the
 * RLS insert policy's expectations — we read them from the active profile via
 * the session and never trust client-supplied identity.
 */
export const useAgentFeedback = (
  options: {
    readonly onSuccess?: (receipt: AgentFeedbackReceipt) => void;
    readonly onError?: (error: unknown) => void;
  } = {}
) => {
  const queryClient = useQueryClient();

  return useMutation<AgentFeedbackReceipt, Error, SubmitAgentFeedbackInput>({
    mutationFn: async (input) => {
      const parsed = feedbackInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error("Invalid agent feedback payload");
      }
      // The insert policy requires user_id = auth.uid() and a matching
      // institution_id; resolve both from the caller's own profile row.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, institution_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();
      if (profileError || !profile?.institution_id) {
        throw new Error("Active profile required for feedback");
      }
      const payload = parsed.data;
      // Tenant check (client-verifiable part): a message_id must belong to a
      // conversation inside the caller's institution. agent_messages RLS is
      // conversation-scoped, so a cross-tenant id resolves to no row here.
      // run_id is enforced DB-side by the composite FK (runs are client-denied).
      if (payload.messageId) {
        const { data: message } = await supabase
          .from("agent_messages")
          .select("id, conversation:agent_conversations(institution_id)")
          .eq("id", payload.messageId)
          .maybeSingle();
        const conversation = (
          message as { conversation?: { institution_id?: string } } | null
        )?.conversation;
        if (!message || conversation?.institution_id !== profile.institution_id) {
          throw new Error("Referenced message not found in your institution");
        }
      }
      const { data, error } = await supabase
        .from("agent_feedback")
        .insert({
          institution_id: profile.institution_id,
          user_id: profile.id,
          run_id: payload.runId ?? null,
          message_id: payload.messageId ?? null,
          rating: payload.rating,
          comment: payload.comment,
          categories: payload.categories ?? {},
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Feedback could not be recorded");
      return { id: data.id };
    },
    onSuccess: (receipt) => {
      void queryClient.invalidateQueries({
        queryKey: ["agent-feedback"],
      });
      options.onSuccess?.(receipt);
    },
    onError: (error) => options.onError?.(error),
  });
};
