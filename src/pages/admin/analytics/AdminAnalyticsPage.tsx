// =============================================================================
// AdminAnalyticsPage — Institution Analytics (Prototype Parity & Real Backend)
// Rebuilds `prototype/admin-analytics.html` on `@/design-system` + tokens
// Requirements: 1, 2, 3, 4, 5
// =============================================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PloAttainmentHeatmap } from "@/features/admin/analytics";
import { classifyPloAttainment } from "@/lib/ploAttainmentBand";
import { PCard, Shimmer } from "@/design-system";
import { useAIPerformance } from "@/hooks/useAIPerformance";
import {
  useAdminAnalytics,
  MIN_COHORT_THRESHOLD,
} from "@/hooks/useAdminAnalytics";
import { useAdminPLOHeatmap } from "@/hooks/useAdminPLOHeatmap";
import { useDepartmentAnalytics } from "@/hooks/useAdminDashboard";
import { usePrograms } from "@/hooks/usePrograms";
import {
  AdminSectionHeader,
  AdminStatusPill,
  adminPageClass,
  adminTableClass,
} from "@/design-system";

const AdminAnalyticsPage = () => {
  const { t } = useTranslation("common");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const { data: analytics, isLoading, error } = useAdminAnalytics();
  const programsQuery = usePrograms({ pageSize: 100 });
  const aiPerformanceQuery = useAIPerformance();
  const departmentAttainmentQuery = useDepartmentAnalytics();
  const ploQuery = useAdminPLOHeatmap(
    selectedProgram === "all" ? undefined : selectedProgram
  );

  if (isLoading) {
    return (
      <div className="space-y-4 no-scrollbar">
        <Shimmer className="h-14 rounded-2xl" />
        <Shimmer className="h-44 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Shimmer className="h-44 rounded-2xl" />
          <Shimmer className="h-44 rounded-2xl" />
        </div>
        <Shimmer className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || departmentAttainmentQuery.error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-transparent p-6 text-center text-red-700">
        <p className="font-bold">
          {t("common.errorLoading", "Failed to load analytics")}
        </p>
        <p className="text-xs mt-1">
          {error instanceof Error
            ? error.message
            : departmentAttainmentQuery.error instanceof Error
            ? departmentAttainmentQuery.error.message
            : "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  const {
    weeklyActiveLearners,
    masteryDistribution,
    retentionRisk,
    departments,
  } = analytics;
  const departmentRows = departments.map((department) => {
    const attainment = departmentAttainmentQuery.data?.find(
      (row) => row.department_name === department.departmentName
    );
    return {
      ...department,
      masteryPercent:
        attainment?.avg_plo_attainment ?? department.masteryPercent,
    };
  });
  const aiCopilotPerformance = aiPerformanceQuery.data
    ? {
        ...aiPerformanceQuery.data,
        hasSufficientData:
          aiPerformanceQuery.data.suggestionTotal >= 5 ||
          aiPerformanceQuery.data.predictionTotal >= 5 ||
          aiPerformanceQuery.data.draftTotal >= 5,
      }
    : analytics.aiCopilotPerformance;
  const ploAttainment = ploQuery.data
    ? ploQuery.data.map((row) => ({
        ploId: row.plo_id,
        ploCodeTitle: row.plo_title,
        // Display the raw source value; band classification precedes rounding.
        meanAttainment: row.attainment_percent,
        derivation: row.derivation,
        contributingCount: row.contributing_count,
        statusBand: classifyPloAttainment(row.attainment_percent),
      }))
    : selectedProgram === "all"
    ? analytics.ploAttainment
    : [];
  // A selected program must never silently show the unfiltered aggregate while
  // its own PLO query is pending or failed.
  const ploFilterState =
    selectedProgram === "all"
      ? "ready"
      : ploQuery.isError
      ? "error"
      : ploQuery.isPending
      ? "loading"
      : "ready";
  const latestActive = weeklyActiveLearners[weeklyActiveLearners.length - 1];
  const hasWeeklyDenominator = weeklyActiveLearners.some(
    (point) => point.eligibleLearners > 0
  );
  const hasLearners = retentionRisk.total > 0;
  const activePillLabel = latestActive?.eligibleLearners
    ? `${latestActive.activePercent}% active`
    : "—";

  return (
    <div className={`${adminPageClass} no-scrollbar`}>
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Institution analytics
        </h1>
        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
          Engagement, mastery &amp; retention — de-identified &amp; aggregated.
        </p>
      </div>
      {/* 1. Engagement trend (Weekly active learners) */}
      <PCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <AdminSectionHeader emoji="📈" title="Weekly active learners" />
          <AdminStatusPill tone="green">{activePillLabel}</AdminStatusPill>
        </div>

        {/* 5-week Bar Chart */}
        {hasWeeklyDenominator ? (
          <div className="flex h-28 items-end gap-2.5 border-b border-border pb-0">
            {weeklyActiveLearners.map((pt, idx) => {
              const isLatest = idx === weeklyActiveLearners.length - 1;
              const barHeightPct = Math.min(pt.activePercent, 100);

              return (
                <div
                  key={pt.week}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${barHeightPct}%`,
                      backgroundColor: isLatest ? "#14b8a6" : "#3b82f6",
                    }}
                    title={`${pt.week}: ${pt.activeLearners} / ${pt.eligibleLearners} active (${pt.activePercent}%)`}
                  />
                  <span
                    className={`text-[9px] ${
                      isLatest
                        ? "font-extrabold text-foreground/80 dark:text-slate-200"
                        : "text-muted-foreground"
                    }`}
                  >
                    {pt.week}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-slate-50 p-4 text-center text-xs text-muted-foreground">
            No live learner activity data is available for this institution.
          </p>
        )}
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>5-week trend · active learners / week</span>
          <span className="italic text-muted-foreground font-medium">
            Real live Supabase data
          </span>
        </div>
      </PCard>
      {/* 2. Mastery Distribution & Retention Risk (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Mastery Distribution */}
        <PCard className="p-4">
          <AdminSectionHeader
            emoji="🎯"
            title="Mastery distribution"
            className="mb-3"
          />

          {hasLearners ? (
            <div className="space-y-2.5">
              {[
                {
                  label: "Excellent",
                  pct: masteryDistribution.excellentPercent,
                },
                {
                  label: "Satisfactory",
                  pct: masteryDistribution.satisfactoryPercent,
                },
                {
                  label: "Developing",
                  pct: masteryDistribution.developingPercent,
                },
                { label: "Not yet", pct: masteryDistribution.notYetPercent },
                {
                  label: "Unmeasured",
                  pct: masteryDistribution.unmeasuredPercent,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-xs w-24 shrink-0 text-muted-foreground dark:text-muted-foreground font-medium">
                    {row.label}
                  </span>
                  <div className="flex-1 h-4 rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-end text-foreground/80">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-slate-50 p-4 text-center text-xs text-muted-foreground">
              No learner records are available for this institution.
            </p>
          )}
        </PCard>

        {/* Retention Risk */}
        <PCard className="p-4">
          <AdminSectionHeader
            emoji="🔻"
            title="Retention risk"
            className="mb-3"
          />

          {hasLearners ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-foreground/80 font-medium">On track</span>
                <b className="text-emerald-600 font-black">
                  {retentionRisk.onTrack}
                </b>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-foreground/80 font-medium">Watch</span>
                <b className="text-amber-600 font-black">
                  {retentionRisk.watch}
                </b>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-foreground/80 font-medium">At risk</span>
                <b className="text-red-600 font-black">
                  {retentionRisk.atRisk}
                </b>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-slate-50 p-4 text-center text-xs text-muted-foreground">
              No learner records are available for retention analysis.
            </p>
          )}

          {hasLearners && (
            <div className="mt-3 rounded-xl border border-amber-200/60 bg-transparent/80 p-3 dark:border-amber-800/40 dark:bg-amber-950/30">
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {retentionRisk.atRisk} of {retentionRisk.total} learners flagged
                at risk across course activities.{" "}
                <Button
                  asChild
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-bold text-amber-900 underline hover:text-amber-700"
                >
                  <Link to="/admin/announcements">Draft outreach</Link>
                </Button>
              </p>
            </div>
          )}
        </PCard>
      </div>
      {/* 3. Department Table */}
      <PCard className="p-4">
        <AdminSectionHeader emoji="🏫" title="Departments" className="mb-3" />

        <div className="overflow-x-auto">
          <table className={adminTableClass}>
            <thead>
              <tr className="border-b border-border text-muted-foreground dark:text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2 text-start">Department</th>
                <th className="pb-2 text-center">Learners</th>
                <th className="pb-2 text-center">Active</th>
                <th className="pb-2 text-center">Mastery</th>
                <th className="pb-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-slate-800">
              {departmentRows.length > 0 ? (
                departmentRows.map((dept) => {
                  const isSuppressed =
                    dept.learners > 0 && dept.learners < MIN_COHORT_THRESHOLD;
                  const masteryTone =
                    dept.masteryPercent >= 80
                      ? "text-emerald-600"
                      : dept.masteryPercent >= 70
                      ? "text-blue-600"
                      : "text-amber-700";

                  return (
                    <tr
                      key={dept.departmentName}
                      className="hover:bg-muted/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 font-bold text-foreground">
                        {dept.departmentName}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-muted-foreground">
                        {isSuppressed ? "< 3 (suppressed)" : dept.learners}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-muted-foreground">
                        {dept.activePercent}%
                      </td>
                      <td className="py-2.5 text-center font-black">
                        <span className={masteryTone}>
                          {dept.masteryPercent}%
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-black text-emerald-600">
                        {dept.trend === "up"
                          ? "↑"
                          : dept.trend === "down"
                          ? "↓"
                          : "→"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No department analytics are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PCard>
      {/* 4. AI Co-Pilot Performance */}
      <PCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <AdminSectionHeader emoji="🤖" title="AI Co-Pilot performance" />
          <AdminStatusPill tone="blue">A2 governance</AdminStatusPill>
        </div>

        {aiCopilotPerformance.hasSufficientData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-foreground/80">
                  Suggestion acceptance
                </span>
                <span className="text-lg font-black text-foreground">
                  {aiCopilotPerformance.suggestionAcceptanceRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.suggestionAcceptanceRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {aiCopilotPerformance.suggestionTotal} module suggestions logged
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-foreground/80">
                  Prediction accuracy
                </span>
                <span className="text-lg font-black text-foreground">
                  {aiCopilotPerformance.predictionAccuracyRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.predictionAccuracyRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {aiCopilotPerformance.predictionTotal} at-risk predictions
                validated
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-foreground/80">
                  Draft acceptance
                </span>
                <span className="text-lg font-black text-foreground">
                  {aiCopilotPerformance.draftAcceptanceRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className="h-full bg-(--success-foreground) rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.draftAcceptanceRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {aiCopilotPerformance.draftTotal} feedback drafts used
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-slate-50/70 p-4 text-center dark:bg-slate-950/40">
            <p className="text-xs font-bold text-foreground/80">
              Not enough usage data
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              AI Co-Pilot metrics will populate automatically as staff generate,
              edit, and validate suggestions.
            </p>
          </div>
        )}

        <div className="mt-3 bg-slate-50 border border-border rounded-xl p-3/40">
          <p className="text-[11px] text-muted-foreground dark:text-muted-foreground leading-relaxed font-medium">
            How often staff accept AI suggestions, how accurate at-risk
            predictions proved, and how often AI feedback drafts were used — the
            trust signals behind the autonomy ceiling.
          </p>
        </div>
      </PCard>
      {/* 5. PLO attainment bands; not the separate mastery-distribution scale. */}
      <PloAttainmentHeatmap
        rows={ploAttainment}
        programs={programsQuery.data?.data ?? []}
        selectedProgram={selectedProgram}
        onProgramChange={setSelectedProgram}
        filterState={ploFilterState}
        onRetry={() => {
          void ploQuery.refetch();
        }}
      />
    </div>
  );
};

export default AdminAnalyticsPage;
