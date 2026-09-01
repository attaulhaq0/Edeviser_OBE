// Feature: Parent digital-twin surface (Wave D parent mount).
//
// Parents read their VERIFIED linked children's digital-twin rows through the
// same student_learning_states SELECT policy chain used by the parent progress
// surface (student_learning_states_parent_read requires
// parent_has_verified_link(student_id) — verified live). The hook fetches the
// parent's own links first (RLS-scoped), then the children's twin rows in one
// IN query, parsing each defensively (fail-closed per row).
//
// DISPLAY/HINT ONLY — never an authorization boundary.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  learningStateRowSchema,
  type LearningStateRow,
} from "@/hooks/useLearningState";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";

export interface ChildLearningState {
  readonly studentId: string;
  readonly state: LearningStateRow | null;
}

export const useParentChildrenLearningStates = () => {
  const identity = useAiIdentity();
  return useQuery<readonly ChildLearningState[]>({
    queryKey: [
      "ai",
      "parent-children-learning-states",
      identity.userId,
      identity.institutionId,
    ],
    queryFn: async () => {
      if (!identity.userId) return [];
      const { data: links, error: linksError } = await supabase
        .from("parent_student_links")
        .select("student_id, verified")
        .eq("parent_id", identity.userId);
      if (linksError) throw linksError;
      const ids = (links ?? [])
        .filter((link) => link.verified === true)
        .map((link) => link.student_id as string);
      if (ids.length === 0) return [];
      const { data: rows, error: statesError } = await supabase
        .from("student_learning_states")
        .select(
          "student_id, calculated_at, fresh_until, mastery, habits, risk_signals"
        )
        .in("student_id", ids);
      if (statesError) throw statesError;
      const byId = new Map<string, LearningStateRow | null>();
      for (const id of ids) byId.set(id, null);
      for (const row of rows ?? []) {
        const parsed = learningStateRowSchema.safeParse(row);
        if (parsed.success) byId.set(parsed.data.student_id, parsed.data);
      }
      return [...byId.entries()].map(([studentId, state]) => ({
        studentId,
        state,
      }));
    },
    enabled: identity.ready && identity.role === "parent",
    staleTime: 60_000,
    retry: 1,
  });
};
