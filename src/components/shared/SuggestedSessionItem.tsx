// =============================================================================
// SuggestedSessionItem — Derived, non-persisted study-session suggestion shown
// on otherwise-empty planner days (R19.2). Renders a dashed "suggested" card
// with an optional "Plan session" action. All copy is routed through i18next
// (en + ar) via the `student` namespace.
// =============================================================================

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestedStudySession } from "@/types/planner";
import { Lightbulb, Plus } from "lucide-react";

interface SuggestedSessionItemProps {
  suggestion: SuggestedStudySession;
  onPlan?: (suggestion: SuggestedStudySession) => void;
  compact?: boolean;
}

const SuggestedSessionItem = ({
  suggestion,
  onPlan,
  compact = false,
}: SuggestedSessionItemProps) => {
  const { t } = useTranslation("student");

  const heading = suggestion.courseName
    ? t("planner.suggestion.withCourse", { course: suggestion.courseName })
    : t("planner.suggestion.label");

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-teal-300 bg-teal-50/40 p-2.5",
        compact && "p-2"
      )}
      data-testid="suggested-session"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">
            {heading}
          </h4>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {t("planner.suggestion.duration", {
              minutes: suggestion.durationMinutes,
            })}
          </p>
        </div>
      </div>

      {onPlan && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-7 w-full gap-1 border-teal-300 text-[11px] text-teal-700 hover:bg-teal-100/60"
          onClick={() => onPlan(suggestion)}
          aria-label={t("planner.suggestion.ariaPlan", {
            minutes: suggestion.durationMinutes,
          })}
        >
          <Plus className="h-3 w-3" />
          {t("planner.suggestion.plan")}
        </Button>
      )}
    </div>
  );
};

export default SuggestedSessionItem;
export type { SuggestedSessionItemProps };
