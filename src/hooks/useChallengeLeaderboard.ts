// =============================================================================
// useChallengeLeaderboard — TanStack Query hook for challenge leaderboard
// Task 3.7: fetch challenge leaderboard sorted by progress desc, completion time
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChallengeLeaderboardEntry {
  participant_id: string;
  participant_type: "team" | "individual";
  current_progress: number;
  completed_at: string | null;
  rank: number;
}

// ─── useChallengeLeaderboard ─────────────────────────────────────────────────

export const useChallengeLeaderboard = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeLeaderboard.list({ challengeId }),
    queryFn: async (): Promise<ChallengeLeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select(
          "participant_id, participant_type, current_progress, completed_at"
        )
        .eq("challenge_id", challengeId!)
        .order("current_progress", { ascending: false })
        .order("completed_at", { ascending: true, nullsFirst: false });
      if (error) throw error;

      // Assign ranks — participants with same progress get same rank
      const entries: ChallengeLeaderboardEntry[] = [];
      let currentRank = 1;

      // `participant_type` is a plain string column in the DB; narrow it to the
      // domain union, defaulting unknown values to "individual".
      const rows = (data ?? []).map((row) => ({
        participant_id: row.participant_id,
        participant_type: (row.participant_type === "team"
          ? "team"
          : "individual") as "team" | "individual",
        current_progress: row.current_progress,
        completed_at: row.completed_at,
      }));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (i > 0 && row.current_progress < rows[i - 1]!.current_progress) {
          currentRank = i + 1;
        }
        entries.push({ ...row, rank: currentRank });
      }

      return entries;
    },
    enabled: !!challengeId,
  });
};
