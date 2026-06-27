// =============================================================================
// useChallenges — TanStack Query hooks for social challenge CRUD
// Task 3.5: list challenges by course (active/upcoming/ended), create challenge
//           (with cooperative default and XP Race limit check), update challenge
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { pickColumns } from "@/lib/db/pickColumns";
import { SOCIAL_CHALLENGES_INSERT_COLUMNS } from "@/lib/db/insertColumns";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChallengeType =
  | "academic"
  | "habit"
  | "xp_race"
  | "blooms_climb"
  | "cooperative";
export type ChallengeStatus = "draft" | "active" | "ended" | "cancelled";
export type ParticipationMode = "team" | "individual";

export interface SocialChallenge {
  id: string;
  course_id: string;
  institution_id: string;
  title: string;
  description: string;
  challenge_type: ChallengeType;
  participation_mode: ParticipationMode;
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id: string | null;
  status: ChallengeStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── useChallenges — list challenges by course with optional status filter ───

export const useChallenges = (courseId?: string, status?: ChallengeStatus) => {
  return useQuery({
    queryKey: queryKeys.challenges.list({ courseId, status }),
    queryFn: async (): Promise<SocialChallenge[]> => {
      let query = supabase
        .from("social_challenges" as never)
        .select("*")
        .eq("course_id", courseId!)
        .order("start_date", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SocialChallenge[];
    },
    enabled: !!courseId,
  });
};

// ─── useActiveXpRaceCount — check XP Race limit (max 2 concurrent per course)

export const useActiveXpRaceCount = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.challenges.list({
      courseId,
      type: "xp_race",
      status: "active",
    }),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("social_challenges" as never)
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId!)
        .eq("challenge_type", "xp_race")
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!courseId,
  });
};

// ─── useCreateChallenge ──────────────────────────────────────────────────────

// Feature: qa-partner-review-remediation — Req 2
// Typed input for challenge creation. The loose `[key: string]: unknown` index
// signature was removed so the generated `social_challenges` Insert type can do
// its job once the `as never` casts are dropped. `xp_race_acknowledged` is a
// UI-only acknowledgment-gate field (see `src/lib/schemas/challenge.ts`) and is
// never a real column — `pickColumns` strips it before the insert.
export interface CreateChallengeInput {
  course_id: string;
  institution_id?: string;
  created_by: string;
  title: string;
  description: string;
  challenge_type: ChallengeType;
  participation_mode: ParticipationMode;
  goal_target: number;
  start_date: string;
  end_date: string;
  reward_xp: number;
  reward_badge_id?: string | null;
  status?: ChallengeStatus;
  /** UI-only confirmation gate — not a column of `social_challenges`. */
  xp_race_acknowledged?: boolean;
}

export const useCreateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      // XP Race limit check: max 2 concurrent per course
      if (input.challenge_type === "xp_race") {
        const { count, error: countError } = await supabase
          .from("social_challenges")
          .select("id", { count: "exact", head: true })
          .eq("course_id", input.course_id)
          .eq("challenge_type", "xp_race")
          .eq("status", "active");
        if (countError) throw countError;
        if ((count ?? 0) >= 2) {
          throw new Error(
            "Maximum of 2 concurrent XP Race challenges per course"
          );
        }
      }

      const { institution_id } = input;
      if (!institution_id) {
        throw new Error("Challenge requires an institution");
      }

      // Whitelist to real columns only — drops `xp_race_acknowledged` and any
      // other non-column field. The narrowed `institution_id` (NOT NULL) is
      // guaranteed present above.
      const row = pickColumns(
        { ...input, institution_id },
        SOCIAL_CHALLENGES_INSERT_COLUMNS
      );

      const { data, error } = await supabase
        .from("social_challenges")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as SocialChallenge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create challenge");
    },
  });
};

// ─── useUpdateChallenge ──────────────────────────────────────────────────────

interface UpdateChallengeInput {
  id: string;
  title?: string;
  description?: string;
  goal_target?: number;
  start_date?: string;
  end_date?: string;
  reward_xp?: number;
  reward_badge_id?: string | null;
  status?: ChallengeStatus;
}

export const useUpdateChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateChallengeInput) => {
      const { data, error } = await supabase
        .from("social_challenges" as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SocialChallenge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update challenge");
    },
  });
};

// ─── Legacy types & hooks (preserved for backward compatibility) ─────────────

/**
 * @deprecated Use {@link SocialChallenge} instead. Kept as an alias so the
 * remaining legacy consumers keep compiling, but it now resolves to the LIVE
 * `social_challenges` shape. The previously-modelled columns `goal_metric`,
 * `reward_type`, `reward_value`, `notification_sent_90` and the legacy
 * `challenge_type` values (`team`/`course_wide`) do NOT exist in the database —
 * referencing them threw `column social_challenges.goal_metric does not exist`
 * at runtime. The live equivalents are `participation_mode` (team/individual),
 * `reward_xp` + `reward_badge_id`, and the `ended` status (not `completed`).
 */
export type Challenge = SocialChallenge;

/** @deprecated Use ChallengeProgressRecord from useChallengeProgress instead */
export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  participant_id: string;
  participant_type: "team" | "student";
  current_progress: number;
}

/**
 * Batch-fetch participants for multiple challenges in one query.
 * Eliminates the N+1 pattern where each ChallengeCard fires its own query.
 */
export const useChallengeParticipantsBatch = (challengeIds: string[]) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.list({ ids: challengeIds }),
    queryFn: async (): Promise<Record<string, ChallengeParticipant[]>> => {
      if (challengeIds.length === 0) return {};

      const { data, error } = await supabase
        .from("challenge_participants")
        .select(
          "id, challenge_id, participant_id, participant_type, current_progress"
        )
        .in("challenge_id", challengeIds);
      if (error) throw error;

      // Group by challenge_id
      const grouped: Record<string, ChallengeParticipant[]> = {};
      for (const row of (data ?? []) as unknown as ChallengeParticipant[]) {
        const key = row.challenge_id;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        (grouped[key] as ChallengeParticipant[]).push(row);
      }
      return grouped;
    },
    enabled: challengeIds.length > 0,
    staleTime: DASHBOARD_STALE_TIME_MS,
    retry: 1,
  });
};

/** @deprecated Use useChallengeAllProgress from useChallengeProgress instead */
export const useChallengeProgress = (challengeId?: string) => {
  return useQuery({
    queryKey: queryKeys.challengeProgress.detail(challengeId ?? ""),
    queryFn: async (): Promise<ChallengeParticipant[]> => {
      const { data, error } = await supabase
        .from("challenge_participants")
        .select(
          "id, challenge_id, participant_id, participant_type, current_progress"
        )
        .eq("challenge_id", challengeId!);
      if (error) throw error;
      return (data ?? []) as unknown as ChallengeParticipant[];
    },
    enabled: !!challengeId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    retry: 1,
  });
};

export const useStudentChallenges = (studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.studentChallenges.detail(studentId ?? ""),
    queryFn: async (): Promise<SocialChallenge[]> => {
      const { data: enrollments } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId!);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      // `select("*")` mirrors the live `social_challenges` columns. The previous
      // explicit list referenced drifted columns (`goal_metric`, `reward_type`,
      // `reward_value`, `notification_sent_90`) that do not exist in the
      // database, which made PostgREST reject the whole query. Live status is
      // `ended` (not `completed`).
      const { data, error } = await supabase
        .from("social_challenges")
        .select("*")
        .in("course_id", courseIds)
        .in("status", ["active", "ended"])
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SocialChallenge[];
    },
    enabled: !!studentId,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};

export const useCancelChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("social_challenges" as never)
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel challenge");
    },
  });
};

export const useAssignTeamsToChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengeId,
      teamIds,
    }: {
      challengeId: string;
      teamIds: string[];
    }) => {
      const rows = teamIds.map((teamId) => ({
        challenge_id: challengeId,
        participant_id: teamId,
        participant_type: "team",
        current_progress: 0,
      }));
      const { error } = await supabase
        .from("challenge_participants" as never)
        .insert(rows as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.challenges.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.challengeProgress.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign teams");
    },
  });
};
