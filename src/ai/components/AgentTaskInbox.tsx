// Feature: Task 3.1 — AgentTaskInbox (Wave D3, 12-component set).
// Approval-inbox surface: lists pending agent proposals addressed to the
// viewer and renders each through AgentApprovalCard. Decisions flow only
// through useProposalDecision (server revalidates status/scope on every call);
// the inbox only filters what is DISPLAYED — it grants no authority.
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AgentInboxEntry } from "@/ai/hooks/useAgentInbox";
import { useProposalDecision } from "@/ai/hooks/useProposalDecision";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProposalViewer } from "@/lib/agentProposals";

export interface AgentTaskInboxProps {
  readonly entries: readonly AgentInboxEntry[];
  readonly viewer: ProposalViewer;
  readonly isLoading?: boolean;
  readonly className?: string;
}

export default function AgentTaskInbox({
  entries,
  viewer,
  isLoading = false,
  className,
}: AgentTaskInboxProps) {
  const { t } = useTranslation("ai");

  const pending = useMemo(
    () => entries.filter((entry) => entry.status === "pending"),
    [entries]
  );

  const decision = useProposalDecision({
    invalidateOnSuccess: [["agent-inbox", viewer.role, viewer.userId]],
  });

  if (isLoading) {
    return (
      <div className={className} aria-busy="true">
        <Skeleton
          className="h-24 w-full rounded-xl"
          data-testid="agent-inbox-skeleton"
        />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className={className} role="status" data-testid="agent-inbox-empty">
        <p className="text-sm text-muted-foreground">
          {t("inbox.empty", "No pending approvals for you right now.")}
        </p>
      </div>
    );
  }

  return (
    <section
      className={className}
      aria-label={t("inbox.title", "Approvals awaiting your decision")}
      data-testid="agent-inbox"
    >
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">
          {t("inbox.title", "Approvals awaiting your decision")}
        </h3>
        <Badge variant="secondary">{pending.length}</Badge>
      </div>
      <ul className="space-y-3">
        {pending.map((entry) => {
          const deciding = decision.isPending;
          return (
            <li key={entry.id}>
              <div className="rounded-xl border border-slate-200/60 bg-white/80 p-3 backdrop-blur-xs">
                {entry.riskProtected ? (
                  <Badge variant="outline" className="mb-2">
                    {t("approvalCard.riskProtected", "Protected action")}
                  </Badge>
                ) : null}
                <p className="text-sm">{entry.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    `approvalCard.actions.${entry.actionType}`,
                    entry.actionType
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    disabled={deciding}
                    onClick={() =>
                      decision.mutate({
                        proposalId: entry.id,
                        decision: "approve",
                      })
                    }
                    data-testid={`agent-inbox-approve-${entry.id}`}
                  >
                    {t("approvalCard.buttons.approve", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deciding}
                    onClick={() =>
                      decision.mutate({
                        proposalId: entry.id,
                        decision: "reject",
                      })
                    }
                    data-testid={`agent-inbox-reject-${entry.id}`}
                  >
                    {t("approvalCard.buttons.reject", "Reject")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
