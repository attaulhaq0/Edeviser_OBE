// =============================================================================
// useSessionCompletion — Complete session → upload evidence → award XP → badges
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { calculateSessionXP } from "@/lib/plannerUtils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompleteSessionInput {
  sessionId: string;
  actualDurationMinutes: number;
  notes?: string | null;
  satisfactionRating?: number | null;
  evidenceFiles?: File[];
}

export interface CompleteSessionResult {
  sessionId: string;
  xpAwarded: number;
  newBadges: string[];
  evidenceCount: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useCompleteSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CompleteSessionInput
    ): Promise<CompleteSessionResult> => {
      if (!user) throw new Error("Not authenticated");

      const {
        sessionId,
        actualDurationMinutes,
        notes,
        satisfactionRating,
        evidenceFiles,
      } = input;

      // 1. Update session status to completed
      const { error: updateError } = await supabase
        .from("study_sessions")
        .update({
          status: "completed",
          actual_end_at: new Date().toISOString(),
          actual_duration_minutes: actualDurationMinutes,
          satisfaction_rating: satisfactionRating ?? null,
        } as never)
        .eq("id", sessionId)
        .eq("student_id", user.id);

      if (updateError) throw updateError;

      // 2. Upload evidence files (if any)
      let evidenceCount = 0;
      if (evidenceFiles && evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const filePath = `session-evidence/${
            user.id
          }/${sessionId}/${Date.now()}_${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("session-evidence")
            .upload(filePath, file);

          if (uploadError) {
            console.error(
              "[useCompleteSession] file upload failed:",
              uploadError.message
            );
            continue;
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("session-evidence").getPublicUrl(filePath);

          // 3. Insert evidence record
          const { error: evidenceError } = await supabase
            .from("session_evidence")
            .insert({
              session_id: sessionId,
              student_id: user.id,
              file_url: publicUrl,
              file_name: file.name,
              file_size_bytes: file.size,
              mime_type: file.type,
              notes: notes ?? null,
            } as never);

          if (evidenceError) {
            console.error(
              "[useCompleteSession] evidence insert failed:",
              evidenceError.message
            );
            continue;
          }

          evidenceCount++;
        }
      } else if (notes) {
        // Insert a text-only evidence record
        const { error: evidenceError } = await supabase
          .from("session_evidence")
          .insert({
            session_id: sessionId,
            student_id: user.id,
            file_url: "",
            file_name: "notes",
            file_size_bytes: 0,
            mime_type: "text/plain",
            notes,
          } as never);

        if (!evidenceError) evidenceCount++;
      }

      // 4. Award XP via award-xp Edge Function
      const hasEvidence = evidenceCount > 0;
      const xpAmount = calculateSessionXP(actualDurationMinutes, hasEvidence);
      let xpAwarded = 0;

      if (xpAmount > 0) {
        try {
          const { data: xpResult } = await supabase.functions.invoke(
            "award-xp",
            {
              body: {
                student_id: user.id,
                xp_amount: xpAmount,
                source: "study_session",
                reference_id: sessionId,
              },
            }
          );
          xpAwarded =
            ((xpResult as Record<string, unknown>)?.xp_awarded as number) ?? 0;
        } catch {
          console.error("[useCompleteSession] award-xp invocation failed");
        }
      }

      // 5. Check badges
      let newBadges: string[] = [];
      try {
        const { data: badgeResult } = await supabase.functions.invoke(
          "check-badges",
          {
            body: {
              student_id: user.id,
              trigger: "study_session",
            },
          }
        );
        newBadges =
          ((badgeResult as Record<string, unknown>)?.new_badges as string[]) ??
          [];
      } catch {
        console.error("[useCompleteSession] check-badges invocation failed");
      }

      // 6. Auto-mark Read habit (if session ≥ 15 min)
      if (actualDurationMinutes >= 15) {
        try {
          const today = new Date().toISOString().split("T")[0] as string;
          await supabase.from("habit_logs" as never).upsert(
            {
              student_id: user.id,
              habit_type: "read",
              date: today,
            } as never,
            { onConflict: "student_id,habit_type,date" }
          );
        } catch {
          console.error("[useCompleteSession] auto-mark Read habit failed");
        }
      }

      return { sessionId, xpAwarded, newBadges, evidenceCount };
    },
    onSuccess: ({ xpAwarded }) => {
      // 7. Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.studySessions.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.plannerTasks.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.weeklyGoals.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.habitLogs.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.badges.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentGamification.lists(),
      });

      if (xpAwarded > 0) {
        toast.success(`Session completed! +${xpAwarded} XP`);
      } else {
        toast.success("Session completed!");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete session: ${error.message}`);
    },
  });
};
