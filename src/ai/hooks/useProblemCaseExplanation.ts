// Feature: Task 8.9 (continuous-verification) — decision-intelligence
// AI explanation hook. Invokes the bounded `explain_problem_case` channel of
// the agent-orchestrator: the server derives the evidence packet from
// `classify_problem_cases_v1` (the client sends identifiers ONLY), frames it
// untrusted to the model, and audits the run. The response is untrusted —
// every field passes a guard before it reaches the UI.
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";

export interface ProblemCaseExplanation {
  readonly runId: string;
  readonly explanation: string;
  readonly model: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Untrusted envelope → validated explanation; malformed shapes yield null. */
const parseExplanation = (value: unknown): ProblemCaseExplanation | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.runId) || !isNonEmptyString(record.explanation))
    return null;
  return {
    runId: record.runId,
    explanation: record.explanation.slice(0, 4000),
    model: isNonEmptyString(record.model) ? record.model : "unknown",
  };
};

export interface ExplainProblemCaseInput {
  courseId: string;
  cloId: string;
}

export const useProblemCaseExplanation = () => {
  const identity = useAiIdentity();
  return useMutation({
    mutationKey: ["agent", "explain-problem-case", identity.institutionId],
    mutationFn: async (
      input: ExplainProblemCaseInput
    ): Promise<ProblemCaseExplanation> => {
      const { data, error } = await supabase.functions.invoke(
        "agent-orchestrator",
        {
          body: {
            action: "explain_problem_case",
            courseId: input.courseId,
            cloId: input.cloId,
          },
        }
      );
      if (error) throw new Error("explanation_unavailable");
      const parsed = parseExplanation(data);
      if (!parsed) throw new Error("explanation_malformed");
      return parsed;
    },
  });
};
