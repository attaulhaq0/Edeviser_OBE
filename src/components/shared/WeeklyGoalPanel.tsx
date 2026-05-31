// =============================================================================
// WeeklyGoalPanel — Goal setting panel with up to 3 goal rows
// (type select + target input), progress bars, edit/save toggle,
// disabled for past weeks
// =============================================================================

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import type { GoalProgress, GoalType, WeeklyGoal } from "@/types/planner";
import type { CreateWeeklyGoalInput } from "@/lib/schemas/planner";
import {
  Target,
  Plus,
  Pencil,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

interface ExampleGoalDisplay {
  /** Localized goal-type label, e.g. "Study Hours". */
  label: string;
  /** Localized target text, e.g. "5 hours". */
  targetText: string;
}

interface WeeklyGoalPanelProps {
  goals: WeeklyGoal[];
  progress: GoalProgress[];
  weekStartDate: string;
  onSave: (goals: CreateWeeklyGoalInput[]) => void;
  isEditable?: boolean;
  isPending?: boolean;
  /**
   * Example goals to display when the student has set none, guiding
   * goal-setting (R19.4). Already localized by the consumer. When omitted, the
   * panel falls back to its plain empty state.
   */
  exampleGoals?: ExampleGoalDisplay[];
  /** Localized copy for the example-goals block. */
  exampleGoalsCopy?: { heading: string; hint: string; cta: string };
}

interface GoalDraft {
  goalType: GoalType;
  targetValue: number;
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  study_hours: "Study Hours",
  sessions_completed: "Sessions",
  tasks_completed: "Tasks",
};

const GOAL_TYPE_UNITS: Record<GoalType, string> = {
  study_hours: "hours",
  sessions_completed: "sessions",
  tasks_completed: "tasks",
};

const WeeklyGoalPanel = ({
  goals,
  progress,
  weekStartDate,
  onSave,
  isEditable = true,
  isPending = false,
  exampleGoals,
  exampleGoalsCopy,
}: WeeklyGoalPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<GoalDraft[]>([]);

  const startEditing = useCallback(() => {
    setDrafts(
      goals.length > 0
        ? goals.map((g) => ({
            goalType: g.goalType,
            targetValue: g.targetValue,
          }))
        : [{ goalType: "study_hours", targetValue: 5 }]
    );
    setIsEditing(true);
  }, [goals]);

  const handleSave = () => {
    const validDrafts = drafts.filter((d) => d.targetValue > 0);
    if (validDrafts.length === 0) return;

    onSave(
      validDrafts.map((d) => ({
        weekStartDate,
        goalType: d.goalType,
        targetValue: d.targetValue,
      }))
    );
    setIsEditing(false);
  };

  const addGoal = () => {
    if (drafts.length >= 3) return;
    const usedTypes = new Set(drafts.map((d) => d.goalType));
    const availableType =
      (
        ["study_hours", "sessions_completed", "tasks_completed"] as GoalType[]
      ).find((t) => !usedTypes.has(t)) ?? "study_hours";
    setDrafts([...drafts, { goalType: availableType, targetValue: 3 }]);
  };

  const removeGoal = (index: number) => {
    setDrafts(drafts.filter((_, i) => i !== index));
  };

  const updateDraft = (index: number, updates: Partial<GoalDraft>) => {
    setDrafts(drafts.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
      <GradientCardHeader icon={Target} title="Weekly Goals">
        {isEditable && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-white hover:bg-white/20 text-xs"
            onClick={startEditing}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-white hover:bg-white/20 text-xs"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        )}
      </GradientCardHeader>

      <div className="p-6 space-y-4">
        {/* Editing mode */}
        {isEditing ? (
          <>
            {drafts.map((draft, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={draft.goalType}
                  onValueChange={(v) =>
                    updateDraft(index, { goalType: v as GoalType })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study_hours">Study Hours</SelectItem>
                    <SelectItem value="sessions_completed">Sessions</SelectItem>
                    <SelectItem value="tasks_completed">Tasks</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={draft.targetValue}
                  onChange={(e) =>
                    updateDraft(index, {
                      targetValue: Number(e.target.value) || 0,
                    })
                  }
                  className="w-20"
                />
                <span className="text-xs text-gray-500">
                  {GOAL_TYPE_UNITS[draft.goalType]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => removeGoal(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            ))}
            {drafts.length < 3 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={addGoal}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Goal
              </Button>
            )}
          </>
        ) : goals.length === 0 ? (
          /* Empty state */
          exampleGoals && exampleGoals.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50/40 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {exampleGoalsCopy?.heading ?? "Goal ideas to get started"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {exampleGoalsCopy?.hint ??
                      "Set a goal below to track your week."}
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {exampleGoals.map((example, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {example.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {example.targetText}
                    </span>
                  </li>
                ))}
              </ul>

              {isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full gap-1 text-xs"
                  onClick={startEditing}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {exampleGoalsCopy?.cta ?? "Set Goals"}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Target className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No goals set for this week
              </p>
              {isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 gap-1 text-xs"
                  onClick={startEditing}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Set Goals
                </Button>
              )}
            </div>
          )
        ) : (
          /* Display mode with progress */
          progress.map((gp) => (
            <div key={gp.goal.id} className="space-y-1.5">
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default WeeklyGoalPanel;
export type { WeeklyGoalPanelProps, ExampleGoalDisplay };
