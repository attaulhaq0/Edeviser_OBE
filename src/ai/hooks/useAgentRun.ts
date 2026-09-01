// Feature: Unified agent UI (tasks.md 3.1/3.3) — orchestrator run hook.
//
// Owns the ONLY client call into the `agent-orchestrator` edge function's chat
// channel. The backend re-resolves identity, role, specialist availability
// (SPECIALISTS_BY_ROLE), page capabilities and institution autonomy per run;
// this hook is transport + shape validation only.
//
// Fail-closed contract: a non-2xx response is mapped to an AgentRunError whose
// `code` mirrors the backend error code (e.g. `ai_feature_disabled`), so the
// conversation surface can render a calm, specific notice instead of a generic
// failure. The server persists the run (agent_runs) + transcript
// (agent_messages); the client keeps an ephemeral transcript for the session.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";

const runResponseSchema = z
  .object({
    response: z.string().min(1),
    specialist: z.string().min(1),
    proposals: z
      .array(
        z.object({
          id: z.string().min(1),
          actionType: z.string().min(1),
          status: z.string().min(1),
        })
      )
      .default([]),
  })
  .passthrough();

export interface AgentRunProposal {
  readonly id: string;
  readonly actionType: string;
  readonly status: string;
}

export interface AgentRunResult {
  readonly response: string;
  readonly specialist: string;
  readonly proposals: readonly AgentRunProposal[];
}

export class AgentRunError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AgentRunError";
  }
}

export interface AgentRunTarget {
  /** Current page route — becomes context.page.route for the run. */
  readonly route: string;
  readonly studentId?: string;
  readonly courseId?: string;
  readonly programId?: string;
}

export const useAgentRun = (target: AgentRunTarget) => {
  const identity = useAiIdentity();
  const queryClient = useQueryClient();

  return useMutation<AgentRunResult, AgentRunError, string>({
    mutationFn: async (message) => {
      if (
        !identity.ready ||
        !identity.userId ||
        !identity.role ||
        !identity.institutionId
      ) {
        throw new AgentRunError(
          "no_identity",
          "Signed-in identity is not resolved yet"
        );
      }
      const { data, error } = await supabase.functions.invoke(
        "agent-orchestrator",
        {
          body: {
            message,
            context: {
              route: target.route,
              studentId: target.studentId,
              courseId: target.courseId,
              programId: target.programId,
            },
            requestId: crypto.randomUUID(),
            sessionId: crypto.randomUUID(),
          },
        }
      );
      if (error) {
        // FunctionsHttpError carries the Response; surface the backend code.
        const fnError = error as { context?: Response };
        let code = "invoke_failed";
        if (fnError.context) {
          try {
            const body = (await fnError.context.json()) as {
              error?: { code?: string };
            };
            code = body?.error?.code ?? code;
          } catch {
            // Body unreadable — keep the generic code.
          }
        }
        throw new AgentRunError(code, `Agent run failed (${code})`);
      }
      const parsed = runResponseSchema.safeParse(data);
      if (!parsed.success) {
        throw new AgentRunError(
          "invalid_response",
          "Agent returned an unexpected response shape"
        );
      }
      // Proposals change the approver's inbox — refresh it eagerly.
      if (parsed.data.proposals.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: ["ai", "proposal-inbox"],
        });
      }
      return {
        response: parsed.data.response,
        specialist: parsed.data.specialist,
        proposals: parsed.data.proposals,
      };
    },
  });
};
