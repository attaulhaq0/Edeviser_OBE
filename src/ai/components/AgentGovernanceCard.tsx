// Feature: Task 6.3 (edeviser-agentic-intelligence) — institutional AI
// governance & cost snapshot for admins.
//
// Data path: agent_runs / agent_tool_attempts / agent_action_proposals are
// RLS deny-all to clients by design, so this card reads ONLY through the
// bounded `get_governance_summary` action of the agent-orchestrator edge
// function (admin role enforced server-side; institution-scoped aggregates;
// 7-day window; token totals from usage payloads). Response is untrusted —
// every field passes a guard before rendering (fail-closed unavailable state).
import { useTranslation } from "react-i18next";
import { useGovernanceSummary } from "@/ai/hooks/useGovernanceSummary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Coins, ShieldAlert, Inbox } from "lucide-react";

export interface AgentGovernanceCardProps {
  readonly className?: string;
}

const Stat = ({
  icon: Icon,
  label,
  value,
  tone = "text-slate-700",
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone?: string;
}) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
    <span className="flex items-center gap-2 text-sm text-gray-700">
      <Icon className="h-4 w-4 text-sky-600" aria-hidden="true" />
      {label}
    </span>
    <span className={`text-sm font-semibold tabular-nums ${tone}`}>
      {value.toLocaleString()}
    </span>
  </div>
);

const AgentGovernanceCard = ({ className }: AgentGovernanceCardProps) => {
  const { t } = useTranslation("ai");
  const { data, isLoading } = useGovernanceSummary();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Coins className="h-4 w-4 text-sky-600" aria-hidden="true" />
          {t("governance.title", "AI Governance & Cost")}
        </CardTitle>
        <Badge variant="outline" className="bg-transparent text-[10px]">
          {t("governance.window", "7 days")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-500">
            {t("governance.loading", "Loading snapshot…")}
          </p>
        ) : !data ? (
          <p className="text-sm text-gray-500">
            {t(
              "governance.unavailable",
              "Governance snapshot is temporarily unavailable."
            )}
          </p>
        ) : (
          <>
            <Stat
              icon={Activity}
              label={t("governance.runs", "Agent runs")}
              value={data.runsTotal}
            />
            <Stat
              icon={ShieldAlert}
              label={t("governance.failed", "Failed runs")}
              value={data.runsFailed}
              tone={data.runsFailed > 0 ? "text-red-600" : "text-emerald-600"}
            />
            <Stat
              icon={Inbox}
              label={t("governance.pending", "Pending approvals")}
              value={data.proposalsPending}
            />
            <Stat
              icon={Coins}
              label={t("governance.tokens", "Tokens used")}
              value={data.totalTokens}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentGovernanceCard;
