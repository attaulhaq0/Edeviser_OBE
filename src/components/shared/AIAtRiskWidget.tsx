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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import AtRiskStudentRow from "@/components/shared/AtRiskStudentRow";
import ErrorState from "@/components/shared/ErrorState";
import {
  useAtRiskPredictions,
  useApproveProactiveIntervention,
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
  const approvalMutation = useApproveProactiveIntervention();
  const [approvalTarget, setApprovalTarget] =
    useState<AIAtRiskPrediction | null>(null);
  const [approvedMessage, setApprovedMessage] = useState("");

  const openApprovalDialog = (prediction: AIAtRiskPrediction) => {
    if (!prediction.suggestion_data.proposal_audit_id) return;
    setApprovalTarget(prediction);
    setApprovedMessage(prediction.suggestion_data.intervention_draft);
  };

  const handleApprove = () => {
    const proposalAuditId = approvalTarget?.suggestion_data.proposal_audit_id;
    if (!approvalTarget || !proposalAuditId) return;
    approvalMutation.mutate(
      { proposalAuditId, approvedMessage },
      {
        onSuccess: () => {
          toast.success(
            `Approved next action sent to ${approvalTarget.student_name}`
          );
          setApprovalTarget(null);
          setApprovedMessage("");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Approval could not be completed"
          );
        },
      }
    );
  };

  return (
    <>
      <PCard className="overflow-hidden">
        <div className="p-5 pb-4">
          <SectionHeader icon={Sparkles} title="Needs Attention" />
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
                  approvalAvailable={Boolean(
                    prediction.suggestion_data.proposal_audit_id
                  )}
                  onReviewDraft={() => openApprovalDialog(prediction)}
                  isApproving={
                    approvalMutation.isPending &&
                    approvalTarget?.id === prediction.id
                  }
                />
              ))}
            </div>
          )}
        </div>
      </PCard>

      {/* Nudge Dialog */}
      <Dialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open) setApprovalTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Approve next action for {approvalTarget?.student_name}
            </DialogTitle>
            <DialogDescription>
              Review the evidence-backed intervention before authorizing the
              student's in-app next action.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-6 text-slate-600">
            This is a protected contact action. Your approval is recorded, the
            worker revalidates your course scope and current evidence, and only
            then creates the student's in-app next action.
          </p>
          <Textarea
            value={approvedMessage}
            onChange={(event) => setApprovedMessage(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Review or revise the intervention draft..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalTarget(null)}
              disabled={approvalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approvalMutation.isPending || !approvedMessage.trim()}
              variant="tactile"
            >
              {approvalMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Approve and send in app
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIAtRiskWidget;
