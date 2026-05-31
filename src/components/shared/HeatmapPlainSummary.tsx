// =============================================================================
// HeatmapPlainSummary — plain-language habit summary for younger students (R22.1)
// =============================================================================
//
// Conveys the student's habit performance in approachable, jargon-free prose so
// the grid does not have to be interpreted on its own. Wording resolves with a
// runtime cross-language fallback (R22.6) via `useApproachableWording`.

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApproachableWording } from "@/hooks/useApproachableWording";
import type { HabitSummary } from "@/lib/heatmapUtils";

export interface HeatmapPlainSummaryProps {
  summary: HabitSummary;
  /** Current academic-habit streak in days. */
  currentStreak: number;
}

/**
 * Renders a friendly, plain-language summary of habit performance.
 *
 * Shows an encouraging empty message when nothing is logged yet, otherwise a
 * completion-rate sentence plus best-habit and streak context — all in
 * approachable wording suitable for younger students (R22.1).
 */
const HeatmapPlainSummary = ({
  summary,
  currentStreak,
}: HeatmapPlainSummaryProps) => {
  const tw = useApproachableWording("student");

  const hasData = summary.bestHabit != null || summary.completionRate > 0;

  const lines: string[] = [];
  if (!hasData) {
    lines.push(tw("heatmap.plainSummary.empty"));
  } else {
    lines.push(
      tw("heatmap.plainSummary.completion", { rate: summary.completionRate })
    );
    if (summary.bestHabit != null) {
      lines.push(
        tw("heatmap.plainSummary.bestHabit", {
          habit: tw(`heatmap.habitLabels.${summary.bestHabit}`),
        })
      );
    }
    if (currentStreak > 0) {
      lines.push(tw("heatmap.plainSummary.streak", { count: currentStreak }));
    } else {
      lines.push(tw("heatmap.plainSummary.encourage"));
    }
  }

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl p-4"
      data-testid="heatmap-plain-summary"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-50 shrink-0">
          <Sparkles className="h-5 w-5 text-teal-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            {tw("heatmap.plainSummary.title")}
          </p>
          <p className="text-sm font-medium text-gray-700 mt-1 leading-relaxed">
            {lines.join(" ")}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default HeatmapPlainSummary;
