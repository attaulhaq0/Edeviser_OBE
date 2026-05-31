// =============================================================================
// useChallengeParticipation — data-access hooks for the challenge detail page
// Feature: student-experience-remediation, Task 25.1 / 25.7
// Requirements: 25.1, 25.2, 25.3, 26.2
// -----------------------------------------------------------------------------
// Relocated from in-page `useQuery` hooks in `ChallengeDetailPage.tsx`, which
// called `supabase.from("challenge_progress" as never)` directly inside the
// component (an ARCH-VIOLATION under R25 plus stale-type `as never` casts under
// R26.2). `challenge_progress` is fully typed in the regenerated `database.ts`,
// so no casts are needed here.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { LeaderboardParticipant } from "@/components/shared/ChallengeLeaderboard";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChallengeProgressRecord {
  current_progress: number;
  completed_at: string | null;
}

// ─── useMyChallengeProgress — current participant's progress on a challenge ──

/**
 * The current participant's progress row for a challenge (zero-or-one).
 * Resolves to `null` when the participant has no progress row yet.
 */
export const useMyChallengeProgress = (
  challengeId?: string,
  participantId?: string
) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({
      challengeId,
      participantId,
    }),
    queryFn: async (): Promise<ChallengeProgressRecord | null> => {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select("current_progress, completed_at")
        .eq("challenge_id", challengeId!)
        .eq("participant_id", participantId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!challengeId && !!participantId,
  });
};

// ─── useChallengeLeaderboardParticipants — ranked participants for display ───

/**
 * All participants for a challenge, sorted by progress and mapped to the shape
 * the `ChallengeLeaderboard` presentational component expects.
 */
export const useChallengeLeaderboardParticipants = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeLeaderboard.list({ challengeId }),
    queryFn: async (): Promise<LeaderboardParticipant[]> => {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select(
          "participant_id, participant_type, current_progress, completed_at"
        )
        .eq("challenge_id", challengeId!)
        .order("current_progress", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row, idx) => ({
        participantId: row.participant_id,
        displayName: `Participant ${idx + 1}`,
        currentProgress: row.current_progress,
        goalTarget: 0,
        completedAt: row.completed_at,
        rank: idx + 1,
      }));
    },
    enabled: !!challengeId,
  });
};
