import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, X } from 'lucide-react';
import { ONBOARDING_XP, MAX_MICRO_DISMISSALS } from '@/lib/onboardingConstants';

export interface MicroAssessmentCardProps {
  assessmentType: string;
  questionCount: number;
  onComplete: () => void;
  onDismiss: () => void;
  dismissalCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  personality: 'Personality',
  self_efficacy: 'Self-Efficacy',
  study_strategy: 'Study Strategy',
  learning_style: 'Learning Style',
  baseline_prompt: 'Baseline Test',
};

const MicroAssessmentCard = ({
  assessmentType,
  questionCount,
  onComplete,
  onDismiss,
  dismissalCount,
}: MicroAssessmentCardProps) => {
  const label = TYPE_LABELS[assessmentType] ?? assessmentType;
  const estimatedMinutes = Math.max(1, Math.ceil(questionCount * 0.4));
  const remainingDismissals = MAX_MICRO_DISMISSALS - dismissalCount;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Quick {label} Check</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                ~{estimatedMinutes} min
              </span>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                +{ONBOARDING_XP.micro_assessment} XP
              </Badge>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss micro-assessment"
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-slate-50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {questionCount} quick question{questionCount !== 1 ? 's' : ''} to refine your profile.
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onComplete}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95 transition-transform duration-100"
        >
          Complete Now
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-xs text-gray-500"
        >
          Remind Me Later
        </Button>
      </div>

      {remainingDismissals <= 1 && remainingDismissals > 0 && (
        <p className="text-[10px] text-amber-600">
          Last chance — this will be skipped if dismissed again.
        </p>
      )}
    </Card>
  );
};

export default MicroAssessmentCard;
