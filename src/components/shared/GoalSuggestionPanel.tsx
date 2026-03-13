import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Check, Pencil, X, Sparkles } from 'lucide-react';
import GoalDifficultyBadge from '@/components/shared/GoalDifficultyBadge';
import type { GoalDifficulty } from '@/lib/goalTemplates';

export interface GoalSuggestion {
  id: string;
  goal_text: string;
  difficulty: GoalDifficulty;
  cohort_completion_rate: number | null;
  status: 'suggested' | 'accepted' | 'modified' | 'dismissed';
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
  const activeSuggestions = suggestions.filter((s) => s.status === 'suggested');

  if (isLoading) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-500">Generating goal suggestions...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg animate-shimmer bg-slate-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (activeSuggestions.length === 0) return null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <Target className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">Suggested Goals</h2>
      </div>

      <div className="p-6 space-y-3">
        <p className="text-xs text-gray-500 mb-2">
          AI-suggested goals based on your courses and progress. Accept, edit, or dismiss.
        </p>

        {activeSuggestions.map((goal) => (
          <div
            key={goal.id}
            className="rounded-lg border border-slate-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 flex-1">{goal.goal_text}</p>
              <GoalDifficultyBadge difficulty={goal.difficulty} />
            </div>

            {goal.cohort_completion_rate != null && (
              <p className="text-[10px] text-gray-400">
                {goal.cohort_completion_rate}% of similar students completed this type of goal
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onAccept(goal.id)}
                className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95 transition-transform duration-100"
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
    </Card>
  );
};

export default GoalSuggestionPanel;
