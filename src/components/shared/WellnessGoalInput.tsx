import { useState } from "react";
import { Target, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WELLNESS_UNITS } from "@/lib/wellnessTips";
import type { WellnessHabitType, WellnessTarget } from "@/types/habits";

const HABIT_LABELS: Record<WellnessHabitType, string> = {
  meditation: "Meditation",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
};

export interface WellnessGoalInputProps {
  habitType: WellnessHabitType;
  target: WellnessTarget | null;
  progress: number;
  currentValue: number;
  onSave: (target: WellnessTarget) => void;
}

const WellnessGoalInput = ({
  habitType,
  target,
  progress,
  currentValue,
  onSave,
}: WellnessGoalInputProps) => {
  const unit = target?.unit ?? WELLNESS_UNITS[habitType];
  const [editValue, setEditValue] = useState<string>(
    target?.targetValue?.toString() ?? ""
  );
  const [isEditing, setIsEditing] = useState(!target);

  const targetMet = progress >= 100;

  const handleSave = () => {
    const numVal = parseFloat(editValue);
    if (isNaN(numVal) || numVal <= 0) return;
    onSave({ habitType, targetValue: numVal, unit });
    setIsEditing(false);
  };

  return (
    <div
      data-testid={`wellness-goal-${habitType}`}
      className="space-y-2 rounded-xl border bg-white p-3 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          <Label className="text-sm font-medium">
            {HABIT_LABELS[habitType]} Goal
          </Label>
        </div>

        {targetMet && (
          <div
            data-testid={`goal-met-${habitType}`}
            className="flex items-center gap-1 text-green-600"
          >
            <Check className="h-4 w-4" />
            <span className="text-xs font-medium">Target met</span>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            data-testid={`goal-input-${habitType}`}
            type="number"
            min={1}
            placeholder="Target"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-24 h-8 text-xs"
            aria-label={`${HABIT_LABELS[habitType]} target in ${unit}`}
          />
          <span className="text-xs text-gray-500">{unit}</span>
          <Button
            data-testid={`goal-save-${habitType}`}
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="h-8 text-xs"
          >
            Save
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span data-testid={`goal-progress-label-${habitType}`}>
              {currentValue}/{target?.targetValue ?? 0} {unit}
            </span>
            <Button
              data-testid={`goal-edit-${habitType}`}
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium h-auto p-0"
            >
              Edit
            </Button>
          </div>

          {/* Progress bar */}
          <div
            data-testid={`goal-progress-bar-${habitType}`}
            className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                targetMet
                  ? "bg-gradient-to-r from-green-400 to-green-500"
                  : "bg-gradient-to-r from-teal-400 to-blue-500"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default WellnessGoalInput;
