// =============================================================================
// useReflectionDigest — Monthly digest query, share/revoke mutations
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ReflectionDigest } from "@/types/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapDigest(row: Record<string, unknown>): ReflectionDigest {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    month: row.month as string,
    themes: (row.themes as ReflectionDigest["themes"]) ?? [],
    growthPatterns:
      (row.growth_patterns as ReflectionDigest["growthPatterns"]) ?? [],
    emotionalTrends:
      (row.emotional_trends as ReflectionDigest["emotionalTrends"]) ?? [],
    suggestedFocus:
      (row.suggested_focus as ReflectionDigest["suggestedFocus"]) ?? [],
    sharedWith: (row.shared_with as ReflectionDigest["sharedWith"]) ?? [],
    createdAt: (row.generated_at as string) ?? "",
  };
}

// ─── useMonthlyDigest — fetch digest for a specific month ────────────────────

export const useMonthlyDigest = (
  studentId: string | undefined,
  month: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.journal.detail(`digest-${studentId}-${month}`),
    enabled: !!studentId && !!month,
    queryFn: async (): Promise<ReflectionDigest | null> => {
      if (!studentId || !month) return null;

      const { data, error } = await supabase
        .from("reflection_digests")
        .select("*")
        .eq("student_id", studentId)
        .eq("month", month)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapDigest(data as Record<string, unknown>);
    },
  });
};

// ─── useShareDigest — share digest with parent/advisor/teacher ───────────────

export const useShareDigest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      digestId: string;
      role: "parent" | "advisor" | "teacher";
    }): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      // Fetch current shared_with array
      const { data: current, error: fetchError } = await supabase
        .from("reflection_digests")
        .select("shared_with")
        .eq("id", input.digestId)
        .eq("student_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const sharedWith =
        ((current as Record<string, unknown>).shared_with as Array<{
          role: string;
          sharedAt: string;
        }>) ?? [];

      // Check if already shared with this role
      if (sharedWith.some((s) => s.role === input.role)) return;

      // Add new share entry
      const updated = [
        ...sharedWith,
        { role: input.role, sharedAt: new Date().toISOString() },
      ];

      const { error } = await supabase
        .from("reflection_digests")
        .update({ shared_with: updated as never })
        .eq("id", input.digestId)
        .eq("student_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
      toast.success("Digest shared successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to share digest: ${error.message}`);
    },
  });
};

// ─── useRevokeDigestShare — revoke sharing with a role ───────────────────────

export const useRevokeDigestShare = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      digestId: string;
      role: "parent" | "advisor" | "teacher";
    }): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      // Fetch current shared_with array
      const { data: current, error: fetchError } = await supabase
        .from("reflection_digests")
        .select("shared_with")
        .eq("id", input.digestId)
        .eq("student_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const sharedWith =
        ((current as Record<string, unknown>).shared_with as Array<{
          role: string;
          sharedAt: string;
        }>) ?? [];

      // Remove the role
      const updated = sharedWith.filter((s) => s.role !== input.role);

      const { error } = await supabase
        .from("reflection_digests")
        .update({ shared_with: updated as never })
        .eq("id", input.digestId)
        .eq("student_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
      toast.success("Sharing revoked");
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke sharing: ${error.message}`);
    },
  });
};
