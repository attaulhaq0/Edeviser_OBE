// =============================================================================
// AIAtRiskWidget — AI-powered at-risk student predictions for Teacher Dashboard
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import AtRiskStudentRow from "@/components/shared/AtRiskStudentRow";
import ErrorState from "@/components/shared/ErrorState";
import {
  useAtRiskPredictions,
  useSendAtRiskNudge,
} from "@/hooks/useAtRiskPredictions";
import type { AIAtRiskPrediction } from "@/hooks/useAtRiskPredictions";
import { Sparkles, CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Component ───────────────────────────────────────────────────────────────

const AIAtRiskWidget = () => {
  const {
    data: predictions,
    isLoading,
    isError,
    refetch,
  } = useAtRiskPredictions();
  const nudgeMutation = useSendAtRiskNudge();
  const [nudgeTarget, setNudgeTarget] = useState<AIAtRiskPrediction | null>(
    null
  );
  const [nudgeMessage, setNudgeMessage] = useState("");

  const openNudgeDialog = (prediction: AIAtRiskPrediction) => {
    setNudgeTarget(prediction);
    setNudgeMessage(
      `Hi ${prediction.student_name}, we noticed you may need some extra support with "${prediction.suggestion_data.at_risk_clo_title}". Let us know how we can help!`
    );
  };

  const handleSendNudge = () => {
    if (!nudgeTarget) return;
    nudgeMutation.mutate(
      { studentId: nudgeTarget.student_id, message: nudgeMessage },
      {
        onSuccess: () => {
          toast.success(`Nudge sent to ${nudgeTarget.student_name}`);
          setNudgeTarget(null);
          setNudgeMessage("");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to send nudge"
          );
        },
      }
    );
  };

  return (
    <>
      <PCard className="overflow-hidden">
        <div className="p-5 pb-4">
          <SectionHeader icon={Sparkles} title="AI At-Risk Students" />
        </div>

        <div className="space-y-4 px-5 pb-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              message="We couldn't load AI at-risk predictions."
              onRetry={() => refetch()}
              className="py-8"
            />
          ) : !predictions || predictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-green-50 mb-3">
                <CheckSquare className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">
                No AI at-risk predictions. All students are on track!
              </p>
            </div>
          ) : (
            <div>
              {predictions.map((prediction) => (
                <AtRiskStudentRow
                  key={prediction.id}
                  studentName={prediction.student_name}
                  cloTitle={prediction.suggestion_data.at_risk_clo_title}
                  probabilityScore={
                    prediction.suggestion_data.probability_score
                  }
                  contributingSignals={
                    prediction.suggestion_data.contributing_signals
                  }
                  onSendNudge={() => openNudgeDialog(prediction)}
                  isNudging={
                    nudgeMutation.isPending &&
                    nudgeTarget?.student_id === prediction.student_id
                  }
                />
              ))}
            </div>
          )}
        </div>
      </PCard>

      {/* Nudge Dialog */}
      <Dialog
        open={!!nudgeTarget}
        onOpenChange={(open) => {
          if (!open) setNudgeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Nudge to {nudgeTarget?.student_name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={nudgeMessage}
            onChange={(e) => setNudgeMessage(e.target.value)}
            rows={4}
            placeholder="Write a personalized message..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNudgeTarget(null)}
              disabled={nudgeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNudge}
              disabled={nudgeMutation.isPending || !nudgeMessage.trim()}
              variant="tactile"
            >
              {nudgeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Send Nudge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIAtRiskWidget;
