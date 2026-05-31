import { Award, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HabitSummary } from "@/lib/heatmapUtils";
import type { HabitType } from "@/types/habits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapHabitSummaryProps {
  summary: HabitSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HABIT_LABELS: Record<HabitType, string> = {
  login: "Login",
  submit: "Submit",
  journal: "Journal",
  read: "Read",
  meditation: "Meditation",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
};

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  caption?: string;
  iconColor: string;
  iconBg: string;
  testId: string;
}

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  caption,
  iconColor,
  iconBg,
  testId,
}: SummaryCardProps) => (
  <Card
    className="bg-white border-0 shadow-md rounded-xl p-4 group"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1" data-testid={`${testId}-value`}>
          {value}
        </p>
        {caption && <p className="text-xs text-gray-500 mt-0.5">{caption}</p>}
      </div>
      <div
        className={cn(
          "p-2 rounded-lg group-hover:scale-110 transition-transform",
          iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows the student's best-performing habit and overall completion rate across
 * the heatmap period (R7.2).
 */
const HeatmapHabitSummary = ({ summary }: HeatmapHabitSummaryProps) => {
  const bestHabitLabel =
    summary.bestHabit != null ? HABIT_LABELS[summary.bestHabit] : "—";
  const bestHabitCaption =
    summary.bestHabit != null
      ? `${summary.bestHabitCount} day${
          summary.bestHabitCount === 1 ? "" : "s"
        }`
      : "No habits logged yet";

  return (
    <div className="grid grid-cols-2 gap-4" data-testid="heatmap-habit-summary">
      <SummaryCard
        icon={Award}
        label="Best Habit"
        value={bestHabitLabel}
        caption={bestHabitCaption}
        iconColor="text-amber-500"
        iconBg="bg-amber-50"
        testId="kpi-best-habit"
      />
      <SummaryCard
        icon={Target}
        label="Completion Rate"
        value={`${summary.completionRate}%`}
        iconColor="text-green-600"
        iconBg="bg-green-50"
        testId="kpi-completion-rate"
      />
    </div>
  );
};

export default HeatmapHabitSummary;
