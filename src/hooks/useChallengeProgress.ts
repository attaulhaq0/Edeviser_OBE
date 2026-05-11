// =============================================================================
// useChallengeProgress — TanStack Query hooks for challenge progress
// Task 3.6: fetch progress for current participant, fetch challenge detail
//           with progress
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { SocialChallenge } from "@/hooks/useChallenges";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChallengeProgressRecord {
  id: string;
  challenge_id: string;
  participant_type: "team" | "individual";
  participant_id: string;
  current_progress: number;
  completed_at: string | null;
  reward_granted: boolean;
  updated_at: string;
}

export interface ChallengeDetailWithProgress {
  challenge: SocialChallenge;
  progress: ChallengeProgressRecord | null;
}

// ─── useParticipantProgress — fetch progress for a specific participant ──────

export const useParticipantProgress = (
  challengeId?: string,
  participantId?: string
) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({ challengeId, participantId }),
    queryFn: async (): Promise<ChallengeProgressRecord | null> => {
      const { data, error } = await supabase
        .from("challenge_progress" as never)
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("participant_id", participantId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChallengeProgressRecord | null;
    },
    enabled: !!challengeId && !!participantId,
  });
};

// ─── useChallengeDetailWithProgress — challenge + participant progress ────────

export const useChallengeDetailWithProgress = (
  challengeId?: string,
  participantId?: string
) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.detail(challengeId ?? ""),
    queryFn: async (): Promise<ChallengeDetailWithProgress> => {
      // Fetch challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("social_challenges" as never)
        .select("*")
        .eq("id", challengeId!)
        .single();
      if (challengeError) throw challengeError;

      // Fetch participant progress
      let progress: ChallengeProgressRecord | null = null;
      if (participantId) {
        const { data: progressData, error: progressError } = await supabase
          .from("challenge_progress" as never)
          .select("*")
          .eq("challenge_id", challengeId!)
          .eq("participant_id", participantId)
          .maybeSingle();
        if (progressError) throw progressError;
        progress = progressData as ChallengeProgressRecord | null;
      }

      return {
        challenge: challenge as SocialChallenge,
        progress,
      };
    },
    enabled: !!challengeId,
  });
};

// ─── useChallengeAllProgress — all participants' progress for a challenge ────

export const useChallengeAllProgress = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({ challengeId }),
    queryFn: async (): Promise<ChallengeProgressRecord[]> => {
      const { data, error } = await supabase
        .from("challenge_progress" as never)
        .select("*")
        .eq("challenge_id", challengeId!)
        .order("current_progress", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChallengeProgressRecord[];
    },
    enabled: !!challengeId,
  });
};
