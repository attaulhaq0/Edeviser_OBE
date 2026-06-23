// Task 151.4: Badge Tier TanStack Query hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BadgeTier = "bronze" | "silver" | "gold";

export interface TieredBadgeData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  tier: BadgeTier | null;
  is_pinned: boolean;
  archived_at: string | null;
  earned_at: string;
  progress_toward_next: number;
}

export interface SpotlightData {
  category: string;
  is_manual: boolean;
  week_start: string;
}

export interface SpotlightScheduleEntry {
  id: string;
  week_start: string;
  category: string;
  is_manual: boolean;
}

// ─── useTieredBadges ─────────────────────────────────────────────────────────

export const useTieredBadges = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.tieredBadges.detail(studentId ?? ""),
    queryFn: async (): Promise<TieredBadgeData[]> => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("student_id", studentId!)
        .is("team_id", null)
        .order("awarded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => ({
        id: b.id,
        name: b.badge_name,
        emoji: b.emoji ?? "🏅",
        description: "",
        category: b.category ?? "general",
        tier: (b.tier as BadgeTier) ?? null,
        is_pinned: b.is_pinned === true,
        archived_at: b.archived_at ?? null,
        earned_at: b.awarded_at,
        progress_toward_next: 0,
      }));
    },
    enabled: !!studentId,
    staleTime: 120_000,
  });
};

// ─── usePinBadge ─────────────────────────────────────────────────────────────

export const usePinBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ badgeId }: { badgeId: string }) => {
      const { error } = await supabase
        .from("badges")
        .update({ is_pinned: true } as never)
        .eq("id", badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tieredBadges.all });
      toast.success("Badge pinned");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

// ─── useUnpinBadge ───────────────────────────────────────────────────────────

export const useUnpinBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ badgeId }: { badgeId: string }) => {
      const { error } = await supabase
        .from("badges")
        .update({ is_pinned: false } as never)
        .eq("id", badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tieredBadges.all });
      toast.success("Badge unpinned");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

// ─── useBadgeSpotlight ───────────────────────────────────────────────────────

export const useBadgeSpotlight = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.badgeSpotlight.detail(institutionId ?? ""),
    queryFn: async (): Promise<SpotlightData | null> => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStart = monday.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("badge_spotlight_schedule" as never)
        .select("*")
        .eq("institution_id", institutionId!)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        category: row.category as string,
        is_manual: row.is_manual as boolean,
        week_start: row.week_start as string,
      };
    },
    enabled: !!institutionId,
    // Spotlight changes weekly (admin cron); a long staleTime is safe.
    staleTime: 5 * 60_000,
  });
};

// ─── useBadgeSpotlightSchedule ───────────────────────────────────────────────

export const useBadgeSpotlightSchedule = (
  institutionId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.badgeSpotlightSchedule.list({ institutionId }),
    queryFn: async (): Promise<SpotlightScheduleEntry[]> => {
      const { data, error } = await supabase
        .from("badge_spotlight_schedule" as never)
        .select("*")
        .eq("institution_id", institutionId!)
        .order("week_start", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        week_start: row.week_start as string,
        category: row.category as string,
        is_manual: row.is_manual as boolean,
      }));
    },
    enabled: !!institutionId,
  });
};

// ─── useUpdateBadgeSpotlightSchedule ─────────────────────────────────────────

export const useUpdateBadgeSpotlightSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      institutionId: string;
      week_start: string;
      category: string;
    }) => {
      const { error } = await supabase
        .from("badge_spotlight_schedule" as never)
        .upsert(
          {
            institution_id: input.institutionId,
            week_start: input.week_start,
            category: input.category,
            is_manual: true,
          } as never,
          { onConflict: "institution_id,week_start" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.badgeSpotlightSchedule.lists(),
      });
      qc.invalidateQueries({ queryKey: queryKeys.badgeSpotlight.all });
      toast.success("Spotlight schedule updated");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};
