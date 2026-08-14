// =============================================================================
// AIAtRiskWidget — AI-powered at-risk student predictions for Teacher Dashboard
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { PCard, SectionHeader, Shimmer } from "@/design-system";
import AtRiskStudentRow from "@/components/shared/AtRiskStudentRow";
import ErrorState from "@/components/shared/ErrorState";
import { useAtRiskPredictions } from "@/hooks/useAtRiskPredictions";
import { Sparkles, CheckSquare } from "lucide-react";

// ─── Component ───────────────────────────────────────────────────────────────

const AIAtRiskWidget = () => {
  const {
    data: predictions,
    isLoading,
    isError,
    refetch,
  } = useAtRiskPredictions();
  return (
    <PCard className="overflow-hidden">
      <div className="p-5 pb-4">
        <SectionHeader icon={Sparkles} title="Needs Attention" />
      </div>

      <div className="space-y-4 ps-5 pe-5 pb-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message="We couldn't load evidence-backed attention flags."
            onRetry={() => refetch()}
            className="py-8"
          />
        ) : !predictions || predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full border border-slate-200/60 bg-white/80 p-3 backdrop-blur-xs">
              <CheckSquare className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-500">
              No current evidence crosses a documented attention trigger.
            </p>
          </div>
        ) : (
          <div>
            {predictions.map((prediction) => (
              <AtRiskStudentRow
                key={prediction.id}
                studentName={prediction.student_name}
                cloTitle={prediction.suggestion_data.clo_title}
                contributingEvidence={
                  prediction.suggestion_data.contributing_evidence
                }
                calculationVersion={
                  prediction.suggestion_data.calculation_version
                }
                triggerVersion={prediction.suggestion_data.trigger_version}
                recommendedNextAction={
                  prediction.suggestion_data.recommended_next_action
                }
                triggeredAt={prediction.suggestion_data.triggered_at}
              />
            ))}
          </div>
        )}
      </div>
    </PCard>
  );
};

export default AIAtRiskWidget;
