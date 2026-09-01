// =============================================================================
// AgentApprovalCard — review surface for a protected agent action proposal
// =============================================================================
// Feature: Approval UX wired to agent_action_proposals (tasks.md 3.4 — Wave D3).
//
// Fail-closed display gates (src/lib/agentProposals.ts):
//   - Non-pending proposals render their outcome and NO decision controls.
//   - Expired-but-still-pending proposals render as expired; no controls.
//   - Viewer failing role/user approver requirements ⇒ controls hidden.
// The orchestrator independently re-verifies everything server-side; these
// checks only prevent showing UI that could never succeed.

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PCard, SectionHeader } from "@/design-system";
import {
  canViewerDecideProposal,
  hasLocalizedActionType,
  isOpenProposal,
  type AgentDecisionError,
  type AgentProposalView,
  type ProposalViewer,
} from "@/lib/agentProposals";
import { useProposalDecision } from "@/ai/hooks/useProposalDecision";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentApprovalCardProps {
  readonly proposal: AgentProposalView;
  /** Authenticated actor considering the proposal (from useAuth). */
  readonly viewer: ProposalViewer;
  /** Called after a successful approve/reject so parents can refresh lists. */
  readonly onDecided?: () => void;
  readonly className?: string;
}

const OUTCOME_ICON: Record<string, LucideIcon> = {
  approved: CheckCircle2,
  executed: CheckCircle2,
};

const AgentApprovalCard = ({
  proposal,
  viewer,
  onDecided,
  className,
}: AgentApprovalCardProps) => {
  const { t, i18n } = useTranslation("ai");
  const [errorCode, setErrorCode] = useState<AgentDecisionError | null>(null);

  const decide = useProposalDecision({
    onSuccess: (result) => {
      setDecided(result.proposal.status);
      onDecided?.();
    },
    onError: (error) => setErrorCode(error),
  });

  // Local receipt state wins over the (immutable) prop once a decision lands.
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);
  const displayStatus = decided ?? proposal.status;
  const effective = { ...proposal, status: displayStatus };
  const decidable = canViewerDecideProposal(effective, viewer);
  // Any proposal that is NOT openly decidable surfaces an outcome/gate banner:
  // terminal statuses show their outcome; a still-pending-but-expired shows expiry.
  const showOutcome = !(
    displayStatus === "pending" && isOpenProposal(proposal)
  );
  const outcomeKey = displayStatus === "pending" ? "expired" : displayStatus;

  const submit = (decision: "approve" | "reject") => {
    setErrorCode(null);
    decide.mutate({ proposalId: proposal.id, decision });
  };

  const OutcomeIcon = OUTCOME_ICON[outcomeKey] ?? AlertCircle;

  return (
    <PCard className={className} data-proposal-id={proposal.id}>
      <div className="p-5 pb-4">
        <SectionHeader
          icon={ShieldCheck}
          title={t("approvalCard.title")}
          description={t("approvalCard.subtitle")}
          action={
            <Badge variant="outline" className="text-xs font-bold">
              {t("approvalCard.riskProtected")}
            </Badge>
          }
        />
      </div>

      <div className="space-y-3 px-5 pb-5">
        {/* Action */}
        <div>
          {hasLocalizedActionType(proposal.actionType) ? (
            <p className="text-sm font-extrabold tracking-[0.02em] text-slate-900">
              {t(`approvalCard.actions.${proposal.actionType}`)}
            </p>
          ) : (
            <code className="text-xs font-bold text-slate-700">
              {proposal.actionType}
            </code>
          )}
        </div>

        {/* Reason */}
        <p className="text-sm font-medium leading-relaxed text-gray-800">
          {proposal.reason}
        </p>

        {/* Meta row: evidence + approver + expiry */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span
            className="flex items-center gap-1"
            title={t("approvalCard.evidenceTitle")}
          >
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            {t("approvalCard.evidenceCount", { count: proposal.evidenceCount })}
          </span>
          <Badge variant="secondary" className="text-[11px] font-bold">
            {t("approvalCard.requires", {
              role: t(`approvalCard.roles.${proposal.requiredApproverRole}`),
            })}
          </Badge>
          {proposal.expiresAt && (
            <span>
              {t("approvalCard.expires", {
                date: new Date(proposal.expiresAt).toLocaleDateString(
                  i18n.language
                ),
              })}
            </span>
          )}
        </div>

        {/* Outcome / gate banners */}
        {showOutcome && (
          <div
            role="status"
            className="flex items-start gap-1.5 rounded-lg bg-slate-50 p-2.5 text-xs font-semibold text-gray-600"
          >
            <OutcomeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t(`approvalCard.outcome.${outcomeKey}`)}
          </div>
        )}

        {/* Error surfacing */}
        {errorCode && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700"
          >
            {t(`approvalCard.errors.${errorCode.code}`)}
          </div>
        )}

        {/* Decisions — hidden entirely unless the display gate passes */}
        {decidable && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={decide.isPending}
              onClick={() => submit("reject")}
            >
              {t("approvalCard.buttons.reject")}
            </Button>
            <Button
              size="sm"
              disabled={decide.isPending}
              onClick={() => submit("approve")}
            >
              {decide.isPending ? (
                <Loader2
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {t("approvalCard.buttons.approve")}
            </Button>
          </div>
        )}
      </div>
    </PCard>
  );
};

export default AgentApprovalCard;
