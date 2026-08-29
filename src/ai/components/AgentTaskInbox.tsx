// =============================================================================
// AgentTaskInbox — approval-inbox surface over the sanctioned read channel
// =============================================================================
// Feature: Unified UI components (tasks.md 3.1 AgentTaskInbox + 3.4 — Wave D).
// Lists proposals returned by the orchestrator's `list_proposals` channel and
// renders each through AgentApprovalCard (server-authoritative decision flow
// with execution-time revalidation). Empty/failed states fail closed — the
// inbox never fabricates proposals.

import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PCard, SectionHeader } from "@/design-system";
import {
  useProposalInbox,
  type ProposalInboxScope,
} from "@/ai/hooks/useProposalInbox";
import AgentApprovalCard from "@/ai/components/AgentApprovalCard";
import type { ProposalViewer } from "@/lib/agentProposals";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentTaskInboxProps {
  /** Authenticated actor deciding the proposals (from useAuth). */
  readonly viewer: ProposalViewer;
  readonly scope?: ProposalInboxScope;
  readonly className?: string;
}

const AgentTaskInbox = ({
  viewer,
  scope = "pending",
  className,
}: AgentTaskInboxProps) => {
  const { t } = useTranslation("ai");
  const inbox = useProposalInbox(scope);

  return (
    <PCard className={className}>
      <SectionHeader
        title={t("inbox.title")}
        description={t("inbox.description")}
        icon={Inbox}
        action={
          !inbox.isLoading && !inbox.isError ? (
            <Badge
              variant="outline"
              className="bg-transparent text-xs font-normal"
            >
              {inbox.data?.length ?? 0}
            </Badge>
          ) : undefined
        }
      />
      <div className="space-y-3 px-5 pb-5">
        {inbox.isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : inbox.isError ? (
          <Alert variant="destructive">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t("inbox.errorTitle")}</AlertTitle>
            <AlertDescription>{t("inbox.errorMessage")}</AlertDescription>
          </Alert>
        ) : (inbox.data?.length ?? 0) === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 p-4 text-center text-sm text-muted-foreground">
            {t("inbox.empty")}
          </p>
        ) : (
          inbox.data?.map((proposal) => (
            <AgentApprovalCard
              key={proposal.id}
              proposal={proposal}
              viewer={viewer}
              onDecided={() => void inbox.refetch()}
            />
          ))
        )}
      </div>
    </PCard>
  );
};

export default AgentTaskInbox;
