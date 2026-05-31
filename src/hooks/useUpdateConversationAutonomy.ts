// =============================================================================
// useUpdateConversationAutonomy — typed mutation for tutor autonomy override
// Feature: student-experience-remediation, Task 7.6
// Requirements: 28.1, 28.3
// -----------------------------------------------------------------------------
// Replaces the raw `(supabase as any).from("tutor_conversations").update(...)`
// previously inlined in TutorPage. `tutor_conversations.autonomy_override` is now
// properly typed (database.ts regenerated in task 4.1), so no casts are needed.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Student-selectable autonomy override; `null` clears the override. */
export type AutonomyOverride = "L1" | "L3" | null;

interface UpdateConversationAutonomyInput {
  conversationId: string;
  level: AutonomyOverride;
}

// ─── useUpdateConversationAutonomy ───────────────────────────────────────────

/**
 * Typed update of a tutor conversation's `autonomy_override`.
 *
 * - Performs a scoped update (`.eq("id", conversationId)`).
 * - Invalidates all tutor-conversation queries on success so the UI reflects
 *   the change (lists, by-course, detail).
 * - Surfaces failures via a Sonner toast and re-throws so callers can react;
 *   never silently discards a failed operation (R28.3).
 */
export const useUpdateConversationAutonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      level,
    }: UpdateConversationAutonomyInput): Promise<void> => {
      const { error } = await supabase
        .from("tutor_conversations")
        .update({ autonomy_override: level })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutorConversations.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tutor autonomy");
    },
  });
};
