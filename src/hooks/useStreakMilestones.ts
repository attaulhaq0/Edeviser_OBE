import { useMemo } from "react";
import type { HeatmapDay, StreakMilestone } from "@/types/habits";
import { detectStreakMilestones } from "@/lib/streakMilestones";

/**
 * Computes achieved streak milestone dates from heatmap data using
 * the detectStreakMilestones utility. This is a pure computation hook
 * — no database query needed.
 */
export const useStreakMilestones = (
  heatmapData: HeatmapDay[] | undefined
): StreakMilestone[] => {
  return useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return [];
    return detectStreakMilestones(heatmapData);
  }, [heatmapData]);
};
