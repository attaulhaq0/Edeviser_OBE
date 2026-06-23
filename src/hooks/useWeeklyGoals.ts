// =============================================================================
// useWeeklyGoals — Query + mutation for weekly goals
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { WeeklyGoal } from "@/types/planner";
import type { CreateWeeklyGoalInput } from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapGoal(row: Record<string, unknown>): WeeklyGoal {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    weekStartDate:
      (row.week_start_date as string) ?? (row.week_start as string) ?? "",
    goalType: (row.goal_type as WeeklyGoal["goalType"]) ?? "study_hours",
    targetValue: Number(row.target_value ?? 0),
  };
}

// ─── useWeeklyGoals — fetch goals for a specific week ────────────────────────

export const useWeeklyGoals = (
  studentId: string | undefined,
  weekStartDate: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.weeklyGoals.list({
      studentId: studentId ?? "",
      weekStartDate: weekStartDate ?? "",
    }),
    enabled: !!studentId && !!weekStartDate,
    // Weekly goals change only via explicit save; 2-min staleTime prevents
    // redundant fetches on planner page re-mounts.
    staleTime: 120_000,
    queryFn: async (): Promise<WeeklyGoal[]> => {
      if (!studentId || !weekStartDate) return [];

      const { data, error } = await supabase
        .from("weekly_goals")
        .select(
          "id, student_id, week_start, week_start_date, goal_type, goal_text, target_value, created_at"
        )
        .eq("student_id", studentId)
        .or(
          `week_start_date.eq.${weekStartDate},week_start.eq.${weekStartDate}`
        );

      if (error) throw error;

      return (data ?? []).map((row) => mapGoal(row as Record<string, unknown>));
    },
  });
};

// ─── useSaveWeeklyGoals — upsert up to 3 goals for a week ───────────────────

export const useSaveWeeklyGoals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      goals: CreateWeeklyGoalInput[]
    ): Promise<WeeklyGoal[]> => {
      if (!user) throw new Error("Not authenticated");

      if (goals.length > 3) {
        throw new Error("Maximum 3 goals per week");
      }

      // Upsert each goal (unique constraint on student_id + week_start_date + goal_type
      // — see migration 20260902000002_weekly_goals_unique_constraint.sql)
      const results: WeeklyGoal[] = [];

      for (const goal of goals) {
        const goalText = `${goal.goalType}: ${goal.targetValue}`;
        const { data, error } = await supabase
          .from("weekly_goals")
          .upsert(
            {
              student_id: user.id,
              week_start: goal.weekStartDate,
              week_start_date: goal.weekStartDate,
              goal_type: goal.goalType,
              goal_text: goalText,
              target_value: goal.targetValue,
            } as never,
            {
              onConflict: "student_id,week_start_date,goal_type",
            }
          )
          .select()
          .single();

        if (error) throw error;
        results.push(mapGoal(data as Record<string, unknown>));
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.weeklyGoals.lists(),
      });
      toast.success("Weekly goals saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
