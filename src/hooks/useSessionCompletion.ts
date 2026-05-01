// =============================================================================
// useSessionCompletion — Complete session → upload evidence → award XP → badges
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import {
  calculateSessionXP,
  generateReviewDates,
  isReviewCycleComplete,
} from "@/lib/plannerUtils";
import { awardWeeklyGoalXPIfMet } from "@/hooks/useWeeklyGoalXP";
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

      // 6a. Award XP for any weekly goals just met (idempotent)
      try {
        await awardWeeklyGoalXPIfMet(user.id);
      } catch {
        console.error("[useCompleteSession] weekly goal XP award failed");
      }

      // 6b. Award review session XP (if this session is linked to a review schedule)
      try {
        const { data: reviewScheduleRows } = await supabase
          .from("review_schedules" as never)
          .select("id, clo_id, interval_days, status")
          .eq("review_session_id", sessionId)
          .eq("student_id", user.id);

        const reviewRows = reviewScheduleRows as Array<{
          id: string;
          clo_id: string;
          interval_days: number;
          status: string;
        }> | null;

        if (reviewRows && reviewRows.length > 0) {
          // This session is a review session — award 15 XP
          try {
            await supabase.functions.invoke("award-xp", {
              body: {
                student_id: user.id,
                xp_amount: 15,
                source: "review_session",
                reference_id: `review_session:${sessionId}`,
              },
            });
          } catch {
            console.error(
              "[useCompleteSession] review_session XP award failed"
            );
          }

          // Check if all 3 intervals (1, 3, 7) are now complete for each CLO
          const cloIds = [...new Set(reviewRows.map((r) => r.clo_id))];

          for (const cloId of cloIds) {
            try {
              const { data: allCloReviews } = await supabase
                .from("review_schedules" as never)
                .select("interval_days, status")
                .eq("student_id", user.id)
                .eq("clo_id", cloId);

              const cloReviewRows = (allCloReviews ?? []) as Array<{
                interval_days: number;
                status: string;
              }>;

              if (
                isReviewCycleComplete(
                  cloReviewRows.map((r) => ({
                    intervalDays: r.interval_days,
                    status: r.status,
                  }))
                )
              ) {
                try {
                  await supabase.functions.invoke("award-xp", {
                    body: {
                      student_id: user.id,
                      xp_amount: 25,
                      source: "review_cycle_complete",
                      reference_id: `review_cycle_complete:${user.id}:${cloId}`,
                      is_milestone: true,
                    },
                  });
                } catch {
                  console.error(
                    "[useCompleteSession] review_cycle_complete XP award failed"
                  );
                }
              }
            } catch {
              console.error(
                "[useCompleteSession] review cycle check failed for CLO:",
                cloId
              );
            }
          }
        }
      } catch {
        console.error("[useCompleteSession] review session XP flow failed");
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

      // 7. Create spaced repetition review schedules for CLO-linked sessions
      try {
        // Fetch the session to get clo_ids and course_id
        const { data: sessionData } = await supabase
          .from("study_sessions")
          .select("clo_ids, course_id")
          .eq("id", sessionId)
          .eq("student_id", user.id)
          .single();

        const cloIds = (sessionData as Record<string, unknown> | null)
          ?.clo_ids as string[] | null;
        const courseId = (sessionData as Record<string, unknown> | null)
          ?.course_id as string | null;

        if (cloIds && cloIds.length > 0 && courseId) {
          const today = new Date().toISOString().split("T")[0] as string;
          const reviewDates = generateReviewDates(today);

          const reviewRows = cloIds.flatMap((cloId) =>
            reviewDates.map(({ reviewDate, intervalDays }) => ({
              student_id: user.id,
              clo_id: cloId,
              course_id: courseId,
              source_session_id: sessionId,
              review_date: reviewDate,
              interval_days: intervalDays,
              status: "pending",
            }))
          );

          await supabase
            .from("review_schedules" as never)
            .upsert(reviewRows as never[], {
              onConflict: "student_id,clo_id,review_date,interval_days",
              ignoreDuplicates: true,
            });
        }
      } catch {
        console.error("[useCompleteSession] review schedule creation failed");
      }

      return { sessionId, xpAwarded, newBadges, evidenceCount };
    },
    onSuccess: ({ xpAwarded }) => {
      // 8. Invalidate queries
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviewSchedules.lists(),
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
