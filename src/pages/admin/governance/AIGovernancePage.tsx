import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  FileClock,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatePanel } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useAIGovernanceUsage } from "@/hooks/useAIGovernance";
import { useAIPerformance } from "@/hooks/useAIPerformance";
import {
  AI_GOVERNANCE_ACTION_POLICIES,
  autonomyBadgeClass,
} from "@/lib/aiGovernancePolicy";
import { cn } from "@/lib/utils";

const Metric = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
    <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
  </div>
);

const AIGovernancePage = () => {
  const { t } = useTranslation("common");
  const { institutionId } = useAuth();
  const usage = useAIGovernanceUsage(institutionId ?? undefined);
  const performance = useAIPerformance();
  const isLoading = usage.isLoading || performance.isLoading;
  const isError = usage.isError || performance.isError;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <PageHeader
          title={t("admin.governance.title", "AI Governance")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit-log">
                <FileClock className="size-4" />
                {t("admin.governance.auditLog", "Full audit log")}
              </Link>
            </Button>
          }
        />
        <p className="max-w-3xl text-xs text-slate-500">
          {t(
            "admin.governance.description",
            "Human approval remains the ceiling for sensitive actions. Usage and quality metrics below come from real institution records."
          )}
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-blue-600" />
              {t(
                "admin.governance.autonomyCeiling",
                "Institution autonomy ceiling"
              )}
            </CardTitle>
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
            >
              {t("admin.governance.roadmap", "Read-only policy · roadmap")}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {t(
              "admin.governance.roadmapNote",
              "Institution-specific policy storage is not available yet. The current product guardrail is shown transparently and cannot be changed on this screen."
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ["A0", t("admin.governance.levels.a0", "Observe and display")],
              ["A1", t("admin.governance.levels.a1", "Suggest and draft")],
              ["A2", t("admin.governance.levels.a2", "Act after approval")],
              [
                "A3",
                t("admin.governance.levels.a3", "Autonomous safe actions"),
              ],
            ].map(([level, label]) => (
              <div
                key={level}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  level === "A2"
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-100 bg-slate-50"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-black",
                    level === "A2" ? "text-blue-700" : "text-slate-400"
                  )}
                >
                  {level}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    level === "A2" ? "text-blue-700" : "text-slate-500"
                  )}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-5 text-amber-800">
              {t(
                "admin.governance.currentPolicy",
                "Current platform guardrail: A2 — AI may act only after a human approves. Grading, publishing, and parent communication are never autonomous."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <StatePanel variant="loading" />
      ) : isError ? (
        <StatePanel
          variant="error"
          message={t(
            "admin.governance.loadError",
            "Could not load AI governance metrics."
          )}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="size-5 text-cyan-600" />
                {t("admin.governance.usage", "Tutor usage this month")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label={t("admin.governance.requests", "Requests")}
                  value={(usage.data?.totalRequests ?? 0).toLocaleString()}
                  detail={t(
                    "admin.governance.loggedRequests",
                    "Logged tutor model calls"
                  )}
                />
                <Metric
                  label={t("admin.governance.successRate", "Success rate")}
                  value={`${usage.data?.successRate ?? 0}%`}
                  detail={`${usage.data?.successfulRequests ?? 0} ${t(
                    "admin.governance.successful",
                    "successful"
                  )}`}
                />
                <Metric
                  label={t("admin.governance.tokens", "Tokens")}
                  value={(usage.data?.totalTokens ?? 0).toLocaleString()}
                  detail={t("admin.governance.monthToDate", "Month to date")}
                />
                <Metric
                  label={t("admin.governance.latency", "Avg latency")}
                  value={`${usage.data?.averageLatencyMs ?? 0} ms`}
                  detail={t(
                    "admin.governance.responseTime",
                    "Server response time"
                  )}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-slate-700">
                  {t("admin.governance.models", "Models used")}
                </p>
                {(usage.data?.models.length ?? 0) === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    {t(
                      "admin.governance.noUsage",
                      "No tutor model calls have been logged this month."
                    )}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {usage.data?.models.map((model) => (
                      <div
                        key={model.model}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700">
                          <Bot className="size-3.5 shrink-0 text-blue-500" />
                          <span className="truncate">{model.model}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {t("admin.governance.modelUsage", {
                            requests: model.requests,
                            tokens: model.tokens.toLocaleString(),
                            defaultValue:
                              "{{requests}} requests · {{tokens}} tokens",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-5 text-violet-600" />
                {t("admin.governance.quality", "AI quality signals")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label={t(
                    "admin.governance.suggestionAcceptance",
                    "Suggestion acceptance"
                  )}
                  value={`${performance.data?.suggestionAcceptanceRate ?? 0}%`}
                  detail={t("admin.governance.suggestionsReviewed", {
                    count: performance.data?.suggestionTotal ?? 0,
                    defaultValue: "{{count}} suggestions reviewed",
                  })}
                />
                <Metric
                  label={t(
                    "admin.governance.predictionAccuracy",
                    "Prediction accuracy"
                  )}
                  value={`${performance.data?.predictionAccuracyRate ?? 0}%`}
                  detail={t("admin.governance.validatedPredictions", {
                    count: performance.data?.predictionTotal ?? 0,
                    defaultValue: "{{count}} validated predictions",
                  })}
                />
                <Metric
                  label={t(
                    "admin.governance.draftAcceptance",
                    "Draft acceptance"
                  )}
                  value={`${performance.data?.draftAcceptanceRate ?? 0}%`}
                  detail={t("admin.governance.feedbackDrafts", {
                    count: performance.data?.draftTotal ?? 0,
                    defaultValue: "{{count}} feedback drafts",
                  })}
                />
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {t("admin.governance.liveData", "Live institution data")}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {t(
                      "admin.governance.noFabricatedMetrics",
                      "No prototype-only counts are shown."
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.governance.perAction", "What AI may do, per action")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.governance.action", "Action")}</TableHead>
                <TableHead>
                  {t("admin.governance.level", "Current level")}
                </TableHead>
                <TableHead>
                  {t("admin.governance.hardCap", "Hard cap")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AI_GOVERNANCE_ACTION_POLICIES.map((policy) => (
                <TableRow key={policy.actionKey}>
                  <TableCell className="font-medium">
                    {t(`admin.governance.actions.${policy.actionKey}`)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={autonomyBadgeClass(policy.level)}
                    >
                      {policy.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.hardCap ? (
                      <span
                        className={cn(
                          "text-xs",
                          policy.sensitive
                            ? "font-semibold text-red-700"
                            : "text-slate-500"
                        )}
                      >
                        {policy.sensitive && "🔒 "}≤ {policy.hardCap}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="size-5 text-violet-600" />
              {t("admin.governance.memory", "AI memory and privacy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <p>
              <strong>
                {t(
                  "admin.governance.memoryItems.tutorLabel",
                  "Tutor conversation:"
                )}
              </strong>{" "}
              {t("admin.governance.memoryItems.tutorValue", "session-scoped")}
            </p>
            <p>
              <strong>
                {t(
                  "admin.governance.memoryItems.learnerLabel",
                  "Learner model:"
                )}
              </strong>{" "}
              {t(
                "admin.governance.memoryItems.learnerValue",
                "persistent and exportable under RLS"
              )}
            </p>
            <p>
              <strong>
                {t(
                  "admin.governance.memoryItems.evidenceLabel",
                  "Outcome evidence:"
                )}
              </strong>{" "}
              {t(
                "admin.governance.memoryItems.evidenceValue",
                "immutable audit evidence"
              )}
            </p>
            <p>
              <strong>
                {t(
                  "admin.governance.memoryItems.piiLabel",
                  "Passwords and raw PII:"
                )}
              </strong>{" "}
              {t(
                "admin.governance.memoryItems.piiValue",
                "never stored in tutor prompts"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.governance.review", "Review and accountability")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-5 text-slate-600">
              {t(
                "admin.governance.reviewNote",
                "Administrative actions are written to the audit log. AI-specific action approvals will appear here when the roadmap policy store is implemented."
              )}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit-log">
                {t("admin.governance.openAudit", "Open audit log")}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIGovernancePage;
