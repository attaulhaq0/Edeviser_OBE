import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, X } from "lucide-react";
import { ONBOARDING_XP, MAX_MICRO_DISMISSALS } from "@/lib/onboardingConstants";

export interface MicroAssessmentCardProps {
  assessmentType: string;
  questionCount: number;
  onComplete: () => void;
  onDismiss: () => void;
  dismissalCount: number;
  /** While a complete/dismiss mutation is in flight, disable both actions so
   * the card reflects progress rather than appearing unresponsive. */
  isPending?: boolean;
}

/** Assessment types that have a dedicated localized label. */
const KNOWN_TYPES = new Set([
  "personality",
  "self_efficacy",
  "study_strategy",
  "learning_style",
  "baseline_prompt",
]);

const MicroAssessmentCard = ({
  assessmentType,
  questionCount,
  onComplete,
  onDismiss,
  dismissalCount,
  isPending = false,
}: MicroAssessmentCardProps) => {
  const { t } = useTranslation(["student", "gamification"]);

  // Use the localized type label when known; otherwise fall back to the raw
  // type so an unseeded/unexpected type still renders meaningfully.
  const typeLabel = KNOWN_TYPES.has(assessmentType)
    ? t(`onboarding.microAssessment.types.${assessmentType}`)
    : assessmentType;
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
            <p className="text-sm font-bold text-gray-900">
              {t("onboarding.microAssessment.title", { type: typeLabel })}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {t("onboarding.microAssessment.estimatedMinutes", {
                  minutes: estimatedMinutes,
                })}
              </span>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                {t("xp.earned", {
                  ns: "gamification",
                  amount: ONBOARDING_XP.micro_assessment,
                })}
              </Badge>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isPending}
          aria-label={t("onboarding.microAssessment.dismiss")}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {t("onboarding.microAssessment.description", {
          count: questionCount,
        })}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onComplete}
          disabled={isPending}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95 transition-transform duration-100"
        >
          {t("onboarding.microAssessment.completeNow")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={isPending}
          className="text-xs text-gray-500"
        >
          {t("onboarding.microAssessment.remindLater")}
        </Button>
      </div>

      {remainingDismissals <= 1 && remainingDismissals > 0 && (
        <p className="text-[10px] text-amber-600">
          {t("onboarding.microAssessment.lastChance")}
        </p>
      )}
    </Card>
  );
};

export default MicroAssessmentCard;
