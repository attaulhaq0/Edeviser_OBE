// =============================================================================
// useReplacementVotes — TanStack Query hooks for replacement vote workflows
// Task 3.12: initiate vote, cast vote, resolve vote, teacher override,
//            list votes for team
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VoteStatus = "open" | "approved" | "rejected" | "expired";

export interface ReplacementVote {
  id: string;
  team_id: string;
  target_member_id: string;
  initiated_by: string;
  status: VoteStatus;
  votes_for: number;
  votes_against: number;
  created_at: string;
  resolved_at: string | null;
  teacher_override: boolean;
}

// ─── useReplacementVotes — list votes for a team ─────────────────────────────

export const useReplacementVotes = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.replacementVotes.list({ teamId }),
    queryFn: async (): Promise<ReplacementVote[]> => {
      const { data, error } = await supabase
        .from("replacement_votes" as never)
        .select("*")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReplacementVote[];
    },
    enabled: !!teamId,
  });
};

// ─── useInitiateVote — captain initiates a replacement vote ──────────────────

interface InitiateVoteInput {
  team_id: string;
  target_member_id: string;
  initiated_by: string;
}

export const useInitiateVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InitiateVoteInput) => {
      // Check 7-day cooldown for the target member
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: recentVotes, error: checkError } = await supabase
        .from("replacement_votes" as never)
        .select("id")
        .eq("team_id", input.team_id)
        .eq("target_member_id", input.target_member_id)
        .gte("created_at", sevenDaysAgo);
      if (checkError) throw checkError;
      if (recentVotes && recentVotes.length > 0) {
        throw new Error(
          "A vote for this member was initiated within the last 7 days"
        );
      }

      const { data, error } = await supabase
        .from("replacement_votes" as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as ReplacementVote;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.replacementVotes.list({
          teamId: variables.team_id,
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate vote");
    },
  });
};

// ─── useCastVote — team member casts a vote ──────────────────────────────────

interface CastVoteInput {
  voteId: string;
  teamId: string;
  voteFor: boolean;
}

export const useCastVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ voteId, voteFor }: CastVoteInput) => {
      // Fetch current vote to increment
      const { data: current, error: fetchError } = await supabase
        .from("replacement_votes" as never)
        .select("votes_for, votes_against")
        .eq("id", voteId)
        .single();
      if (fetchError) throw fetchError;

      const currentVote = current as {
        votes_for: number;
        votes_against: number;
      };
      const newValue = voteFor
        ? { votes_for: currentVote.votes_for + 1 }
        : { votes_against: currentVote.votes_against + 1 };

      const { data, error } = await supabase
        .from("replacement_votes" as never)
        .update(newValue as never)
        .eq("id", voteId)
        .eq("status", "open")
        .select()
        .single();
      if (error) throw error;
      return data as ReplacementVote;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.replacementVotes.list({ teamId: variables.teamId }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cast vote");
    },
  });
};

// ─── useResolveVote — resolve a vote (majority rule) ─────────────────────────

interface ResolveVoteInput {
  voteId: string;
  teamId: string;
  status: "approved" | "rejected";
}

export const useResolveVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ voteId, status }: ResolveVoteInput) => {
      const { data, error } = await supabase
        .from("replacement_votes" as never)
        .update({
          status,
          resolved_at: new Date().toISOString(),
        } as never)
        .eq("id", voteId)
        .select()
        .single();
      if (error) throw error;
      return data as ReplacementVote;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.replacementVotes.list({ teamId: variables.teamId }),
      });
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resolve vote");
    },
  });
};

// ─── useTeacherOverrideVote — teacher overrides a vote result ────────────────

interface TeacherOverrideInput {
  voteId: string;
  teamId: string;
  status: "approved" | "rejected";
}

export const useTeacherOverrideVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ voteId, status }: TeacherOverrideInput) => {
      const { data, error } = await supabase
        .from("replacement_votes" as never)
        .update({
          status,
          resolved_at: new Date().toISOString(),
          teacher_override: true,
        } as never)
        .eq("id", voteId)
        .select()
        .single();
      if (error) throw error;
      return data as ReplacementVote;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.replacementVotes.list({ teamId: variables.teamId }),
      });
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to override vote");
    },
  });
};
