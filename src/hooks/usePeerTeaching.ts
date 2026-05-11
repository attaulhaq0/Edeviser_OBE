// =============================================================================
// usePeerTeaching — TanStack Query hooks for peer teaching moments
// Task 3.13: create teaching moment, list moments by team/CLO, record view,
//            submit rating
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type {
  CreateTeachingMomentInput,
  RateTeachingMomentInput,
} from "@/lib/schemas/peerTeaching";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PeerTeachingMoment {
  id: string;
  team_id: string;
  author_id: string;
  clo_id: string;
  title: string;
  explanation_text: string;
  media_url: string | null;
  status: "active" | "archived";
  created_at: string;
}

export interface TeachingMomentView {
  id: string;
  teaching_moment_id: string;
  viewer_id: string;
  viewed_at: string;
  pre_view_attainment: number | null;
}

export interface TeachingMomentRating {
  id: string;
  teaching_moment_id: string;
  viewer_id: string;
  clarity_rating: number;
  helpfulness_rating: number;
  rated_at: string;
}

// ─── useTeachingMoments — list moments by team ───────────────────────────────

export const useTeachingMoments = (teamId?: string, cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.peerTeachingMoments.list({ teamId, cloId }),
    queryFn: async (): Promise<PeerTeachingMoment[]> => {
      let query = supabase
        .from("peer_teaching_moments" as never)
        .select("*")
        .eq("team_id", teamId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cloId) {
        query = query.eq("clo_id", cloId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PeerTeachingMoment[];
    },
    enabled: !!teamId,
  });
};

// ─── useCreateTeachingMoment ─────────────────────────────────────────────────

interface CreateMomentPayload extends CreateTeachingMomentInput {
  author_id: string;
}

export const useCreateTeachingMoment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMomentPayload) => {
      // Check per-CLO limit: max 3 per student per CLO
      const { count, error: countError } = await supabase
        .from("peer_teaching_moments" as never)
        .select("id", { count: "exact", head: true })
        .eq("author_id", input.author_id)
        .eq("clo_id", input.clo_id)
        .eq("status", "active");
      if (countError) throw countError;
      if ((count ?? 0) >= 3) {
        throw new Error("Maximum of 3 teaching moments per CLO reached");
      }

      const { data, error } = await supabase
        .from("peer_teaching_moments" as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as PeerTeachingMoment;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.peerTeachingMoments.list({
          teamId: variables.team_id,
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create teaching moment");
    },
  });
};

// ─── useRecordView — record a view of a teaching moment ──────────────────────

interface RecordViewInput {
  teaching_moment_id: string;
  viewer_id: string;
  pre_view_attainment?: number | null;
  teamId: string;
}

export const useRecordView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teaching_moment_id,
      viewer_id,
      pre_view_attainment,
    }: RecordViewInput) => {
      const { data, error } = await supabase
        .from("teaching_moment_views" as never)
        .insert({
          teaching_moment_id,
          viewer_id,
          pre_view_attainment: pre_view_attainment ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as TeachingMomentView;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.peerTeachingMoments.list({
          teamId: variables.teamId,
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record view");
    },
  });
};

// ─── useSubmitRating — submit a rating for a teaching moment ─────────────────

interface SubmitRatingPayload extends RateTeachingMomentInput {
  viewer_id: string;
  teamId: string;
}

export const useSubmitRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teaching_moment_id,
      clarity_rating,
      helpfulness_rating,
      viewer_id,
    }: SubmitRatingPayload) => {
      const { data, error } = await supabase
        .from("teaching_moment_ratings" as never)
        .upsert(
          {
            teaching_moment_id,
            viewer_id,
            clarity_rating,
            helpfulness_rating,
            rated_at: new Date().toISOString(),
          } as never,
          { onConflict: "teaching_moment_id,viewer_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as TeachingMomentRating;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.teachingMomentRatings.list({
          momentId: variables.teaching_moment_id,
        }),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.peerTeachingMoments.list({
          teamId: variables.teamId,
        }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit rating");
    },
  });
};

// ─── useMomentRatings — fetch ratings for a teaching moment ──────────────────

export const useMomentRatings = (momentId?: string) => {
  return useQuery({
    queryKey: queryKeys.teachingMomentRatings.list({ momentId }),
    queryFn: async (): Promise<TeachingMomentRating[]> => {
      const { data, error } = await supabase
        .from("teaching_moment_ratings" as never)
        .select("*")
        .eq("teaching_moment_id", momentId!)
        .order("rated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeachingMomentRating[];
    },
    enabled: !!momentId,
  });
};
