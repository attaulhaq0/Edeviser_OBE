// =============================================================================
// useTutorAutonomy — TanStack Query hooks for reading/updating autonomy levels
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { AutonomyLevel } from "@/lib/tutorSchemas";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Narrows a nullable string column (`tutor_autonomy_level`, stored as plain
 * text in the schema) to the strict `AutonomyLevel` union, returning `null`
 * for absent or unrecognized values.
 */
const toAutonomyLevel = (
  value: string | null | undefined
): AutonomyLevel | null =>
  value === "L1" || value === "L2" || value === "L3" ? value : null;

// ─── useAssignmentAutonomy — read tutor_autonomy_level from assignments ──────

export const useAssignmentAutonomy = (assignmentId: string | undefined) => {
  return useQuery({
    queryKey: [...queryKeys.assignments.detail(assignmentId ?? ""), "autonomy"],
    queryFn: async (): Promise<AutonomyLevel | null> => {
      if (!assignmentId) return null;

      const { data, error } = await supabase
        .from("assignments")
        .select("tutor_autonomy_level")
        .eq("id", assignmentId)
        .maybeSingle();

      if (error) throw error;
      return toAutonomyLevel(data?.tutor_autonomy_level);
    },
    enabled: !!assignmentId,
    staleTime: 60_000,
  });
};

// ─── useUpdateAssignmentAutonomy — update assignment autonomy level ──────────

export const useUpdateAssignmentAutonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      autonomyLevel,
    }: {
      assignmentId: string;
      autonomyLevel: AutonomyLevel;
    }) => {
      const { data, error } = await supabase
        .from("assignments")
        .update({ tutor_autonomy_level: autonomyLevel })
        .eq("id", assignmentId)
        .select("id, tutor_autonomy_level")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.assignments.detail(variables.assignmentId),
          "autonomy",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.lists(),
      });
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Failed to update assignment autonomy level"
      );
    },
  });
};

// ─── useCLOAutonomy — read tutor_autonomy_level from learning_outcomes ───────

export const useCLOAutonomy = (cloId: string | undefined) => {
  return useQuery({
    queryKey: [...queryKeys.clos.detail(cloId ?? ""), "autonomy"],
    queryFn: async (): Promise<AutonomyLevel | null> => {
      if (!cloId) return null;

      const { data, error } = await supabase
        .from("learning_outcomes")
        .select("tutor_autonomy_level")
        .eq("id", cloId)
        .maybeSingle();

      if (error) throw error;
      return toAutonomyLevel(data?.tutor_autonomy_level);
    },
    enabled: !!cloId,
    staleTime: 60_000,
  });
};

// ─── useUpdateCLOAutonomy — update CLO autonomy level ────────────────────────

export const useUpdateCLOAutonomy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cloId,
      autonomyLevel,
    }: {
      cloId: string;
      autonomyLevel: AutonomyLevel;
    }) => {
      const { data, error } = await supabase
        .from("learning_outcomes")
        .update({ tutor_autonomy_level: autonomyLevel })
        .eq("id", cloId)
        .select("id, tutor_autonomy_level")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.clos.detail(variables.cloId), "autonomy"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clos.lists(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update CLO autonomy level");
    },
  });
};
