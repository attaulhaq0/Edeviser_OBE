import { useEffect, useMemo } from "react";
import type { HeatmapDay, StreakMilestone } from "@/types/habits";
import { detectStreakMilestones } from "@/lib/streakMilestones";
import { captureAnalyticsEvent } from "@/lib/analyticsConsent";

/**
 * Session-level dedupe: each milestone (30/60/100-day) is reported at most
 * once per browser session, even if the hook recomputes on every render.
 */
const reportedMilestones = new Set<string>();

/**
 * Computes achieved streak milestone dates from heatmap data using
 * the detectStreakMilestones utility. This is a pure computation hook
 * — no database query needed.
 */
export const useStreakMilestones = (
  heatmapData: HeatmapDay[] | undefined
): StreakMilestone[] => {
  const milestones = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return [];
    return detectStreakMilestones(heatmapData);
  }, [heatmapData]);

  // Gamification signal: the student actually saw their streak milestone(s)
  // in the UI. Reported once per milestone per session (consent-gated).
  useEffect(() => {
    for (const milestone of milestones) {
      const key = `${milestone.days}:${milestone.achievedDate}`;
      if (!reportedMilestones.has(key)) {
        reportedMilestones.add(key);
        captureAnalyticsEvent("streak_milestone_seen", {
          milestone_days: milestone.days,
        });
      }
    }
  }, [milestones]);

  return milestones;
};
