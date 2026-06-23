// =============================================================================
// useTeams — TanStack Query hooks for team CRUD operations
// Task 3.1: list teams by course, create team, update team, soft-delete team
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { pickColumns } from "@/lib/db/pickColumns";
import { TEAMS_INSERT_COLUMNS } from "@/lib/db/insertColumns";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  course_id: string;
  institution_id: string;
  name: string;
  captain_id: string;
  avatar_letter: string;
  xp_total: number;
  streak_count: number;
  streak_last_active_date: string | null;
  cooperation_score: number;
  health_score: number;
  health_status: "healthy" | "needs_attention" | "at_risk";
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  member_count?: number;
}

// ─── useTeams — list teams by course ─────────────────────────────────────────

export const useTeams = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.teams.list({ courseId }),
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from("teams" as never)
        .select("*")
        .eq("course_id", courseId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    enabled: !!courseId,
    staleTime: 120_000,
  });
};

// ─── useCreateTeam ───────────────────────────────────────────────────────────

// Feature: qa-partner-review-remediation — Req 3
export interface CreateTeamInput {
  name: string;
  course_id: string;
  institution_id: string; // was optional → now required (NOT NULL)
  captain_id: string; // was optional → now required (NOT NULL)
  created_by: string;
  avatar_letter?: string; // nullable in schema → stays optional
}

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const row = pickColumns(input, TEAMS_INSERT_COLUMNS);
      const { data, error } = await supabase
        .from("teams")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create team");
    },
  });
};

// ─── useUpdateTeam ───────────────────────────────────────────────────────────

interface UpdateTeamInput {
  id: string;
  name?: string;
  captain_id?: string;
}

export const useUpdateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTeamInput) => {
      const { data, error } = await supabase
        .from("teams" as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update team");
    },
  });
};

// ─── useSoftDeleteTeam ───────────────────────────────────────────────────────

// ─── Legacy hooks (preserved for backward compatibility) ─────────────────────

export interface TeamGamification {
  id: string;
  team_id: string;
  xp_total: number;
  streak_count: number;
}

/**
 * Reads team gamification data directly from `teams` table.
 * The previously-referenced `team_gamification` table does not exist in
 * production — XP and streak fields live on `teams` itself.
 */
export const useTeamGamification = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamGamification.list({ teamId }),
    queryFn: async (): Promise<TeamGamification | null> => {
      const { data, error } = await supabase
        .from("teams" as never)
        .select("id, xp_total, streak_count")
        .eq("id", teamId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        id: row.id as string,
        team_id: row.id as string,
        xp_total: (row.xp_total as number) ?? 0,
        streak_count: (row.streak_count as number) ?? 0,
      };
    },
    enabled: !!teamId,
    staleTime: 120_000,
  });
};

export const useAutoGenerateTeams = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      course_id: string;
      team_size: number;
      created_by: string;
      institution_id: string;
    }) => {
      const { data: enrollments } = await supabase
        .from("student_courses")
        .select("student_id")
        .eq("course_id", params.course_id);

      const studentIds = (enrollments ?? []).map((e) => e.student_id);
      if (studentIds.length === 0) throw new Error("No enrolled students");

      const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
      const teamCount = Math.ceil(shuffled.length / params.team_size);
      const teamBuckets: string[][] = Array.from(
        { length: teamCount },
        () => []
      );

      shuffled.forEach((id, i) => {
        teamBuckets[i % teamCount]!.push(id);
      });

      let created = 0;
      for (let i = 0; i < teamBuckets.length; i++) {
        const bucket = teamBuckets[i]!;
        const captainId = bucket[0];
        if (!captainId) continue; // empty bucket — nothing to create

        // Whitelist + typed insert (no `as never`): the first bucket member is
        // the captain, and institution_id comes from the caller's institution.
        const row = pickColumns(
          {
            name: `Team ${i + 1}`,
            course_id: params.course_id,
            institution_id: params.institution_id,
            captain_id: captainId,
            created_by: params.created_by,
            avatar_letter: String(i + 1),
          } satisfies CreateTeamInput,
          TEAMS_INSERT_COLUMNS
        );
        const { data: team, error } = await supabase
          .from("teams")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        if (!team) throw new Error("Team insert returned no row");

        const members = bucket.map((studentId) => ({
          team_id: team.id,
          student_id: studentId,
        }));
        const { error: memberError } = await supabase
          .from("team_members" as never)
          .insert(members as never);
        if (memberError) throw memberError;
        created++;
      }

      return { teams_created: created, students_assigned: shuffled.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to auto-generate teams");
    },
  });
};

// ─── useSoftDeleteTeam ───────────────────────────────────────────────────────

export const useSoftDeleteTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase
        .from("teams" as never)
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", teamId)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete team");
    },
  });
};
