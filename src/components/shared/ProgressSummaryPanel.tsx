// =============================================================================
// ProgressSummaryPanel — Weekly summary: total study hours, sessions completed,
// tasks completed, goal progress bars with success indicators
// =============================================================================

import { Card } from "@/components/ui/card";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import type {
  WeeklyProgressData,
  GoalProgress,
  GoalType,
} from "@/types/planner";
import {
  BarChart3,
  Clock,
  BookOpen,
  CheckSquare,
  CheckCircle2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProgressSummaryPanelProps {
  summary: WeeklyProgressData;
  goals: GoalProgress[];
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  study_hours: "Study Hours",
  sessions_completed: "Sessions",
  tasks_completed: "Tasks",
};

// ─── Component ───────────────────────────────────────────────────────────────

const ProgressSummaryPanel = ({
  summary,
  goals,
  className,
}: ProgressSummaryPanelProps) => {
  const studyHours = (summary.totalStudyMinutes / 60).toFixed(1);

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="progress-summary-panel"
    >
      <GradientCardHeader icon={BarChart3} title="Weekly Summary" />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p
              className="text-2xl font-black text-amber-700"
              data-testid="study-hours"
            >
              {studyHours}h
            </p>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Study Time
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p
              className="text-2xl font-black text-blue-700"
              data-testid="sessions-completed"
            >
              {summary.sessionsCompleted}
            </p>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Sessions
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckSquare className="h-3.5 w-3.5 text-green-600" />
            </div>
            <p
              className="text-2xl font-black text-green-700"
              data-testid="tasks-completed"
            >
              {summary.tasksCompleted}
            </p>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Tasks Done
            </p>
          </div>
        </div>

        {/* Goal Progress */}
        {goals.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Goal Progress
            </h3>
            {goals.map((gp) => (
              <div
                key={gp.goal.id}
                className="space-y-1.5"
                data-testid="goal-progress-item"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {GOAL_TYPE_LABELS[gp.goal.goalType]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">
                      {gp.goal.goalType === "study_hours"
                        ? `${gp.currentValue.toFixed(1)} / ${
                            gp.goal.targetValue
                          }h`
                        : `${gp.currentValue} / ${gp.goal.targetValue}`}
                    </span>
                    {gp.isMet && (
                      <CheckCircle2
                        className="h-4 w-4 text-green-500"
                        data-testid="goal-met-indicator"
                      />
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      gp.isMet
                        ? "bg-green-500"
                        : gp.percentage >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    )}
                    style={{ width: `${Math.min(gp.percentage, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={gp.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${
                      GOAL_TYPE_LABELS[gp.goal.goalType]
                    } progress`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty goal state */}
        {goals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            No goals set for this week
          </p>
        )}
      </div>
    </Card>
  );
};

export default ProgressSummaryPanel;
export type { ProgressSummaryPanelProps };
