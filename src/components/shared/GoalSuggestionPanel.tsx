import { Button } from "@/components/ui/button";
import { Target, Check, Pencil, X, Sparkles } from "lucide-react";
import GoalDifficultyBadge from "@/components/shared/GoalDifficultyBadge";
import type { GoalDifficulty } from "@/lib/goalTemplates";
import { PCard, SectionHeader } from "@/design-system";

export interface GoalSuggestion {
  id: string;
  goal_text: string;
  difficulty: GoalDifficulty;
  cohort_completion_rate: number | null;
  status: "suggested" | "accepted" | "modified" | "dismissed";
}

export interface GoalSuggestionPanelProps {
  suggestions: GoalSuggestion[];
  onAccept: (id: string) => void;
  onEdit: (id: string) => void;
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

const GoalSuggestionPanel = ({
  suggestions,
  onAccept,
  onEdit,
  onDismiss,
  isLoading = false,
}: GoalSuggestionPanelProps) => {
  const activeSuggestions = suggestions.filter((s) => s.status === "suggested");

  if (isLoading) {
    return (
      <PCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-500">
            Generating goal suggestions...
          </span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg animate-shimmer bg-slate-100"
            />
          ))}
        </div>
      </PCard>
    );
  }

  if (activeSuggestions.length === 0) return null;

  return (
    <PCard className="overflow-hidden">
      <div className="p-5 pb-4">
        <SectionHeader icon={Target} title="Suggested Goals" />
      </div>

      <div className="space-y-3 px-5 pb-5">
        <p className="text-xs text-gray-500 mb-2">
          AI-suggested goals based on your courses and progress. Accept, edit,
          or dismiss.
        </p>

        {activeSuggestions.map((goal) => (
          <div
            key={goal.id}
            className="rounded-lg border border-slate-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 flex-1">
                {goal.goal_text}
              </p>
              <GoalDifficultyBadge difficulty={goal.difficulty} />
            </div>

            {goal.cohort_completion_rate != null && (
              <p className="text-[10px] text-gray-400">
                {goal.cohort_completion_rate}% of similar students completed
                this type of goal
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onAccept(goal.id)}
                variant="tactile"
                className="text-xs font-semibold"
              >
                <Check className="h-3 w-3" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(goal.id)}
                className="text-xs"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(goal.id)}
                className="text-xs text-gray-400"
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PCard>
  );
};

export default GoalSuggestionPanel;
