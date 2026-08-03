// =============================================================================
// AdminAnalyticsPage — Institution Analytics (Prototype Parity & Real Backend)
// Rebuilds `prototype/admin-analytics.html` on `@/design-system` + tokens
// Requirements: 1, 2, 3, 4, 5
// =============================================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
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
        meanAttainment: Math.round(row.attainment_percent),
        derivationLabel:
          row.derivation === "program"
            ? `program · ${row.contributing_count} courses`
            : row.derivation === "clo_rollup"
            ? `CLO roll-up · ${row.contributing_count} CLOs`
            : "unmeasured",
        statusBand:
          row.attainment_percent < 0
            ? "unmeasured"
            : row.attainment_percent >= 85
            ? "excellent"
            : row.attainment_percent >= 70
            ? "satisfactory"
            : row.attainment_percent >= 50
            ? "developing"
            : "notYet",
      }))
    : analytics.ploAttainment;

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
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Institution analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
          <div className="flex h-28 items-end gap-2.5 border-b border-slate-100 pb-0 dark:border-slate-800">
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
                        ? "font-extrabold text-slate-700 dark:text-slate-200"
                        : "text-slate-400"
                    }`}
                  >
                    {pt.week}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
            No live learner activity data is available for this institution.
          </p>
        )}
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
          <span>5-week trend · active learners / week</span>
          <span className="italic text-slate-400 font-medium">
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
                  <span className="text-xs w-24 shrink-0 text-slate-600 dark:text-slate-400 font-medium">
                    {row.label}
                  </span>
                  <div className="flex-1 h-4 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-end text-slate-800 dark:text-slate-200">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
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
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  On track
                </span>
                <b className="text-emerald-600 font-black">
                  {retentionRisk.onTrack}
                </b>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Watch
                </span>
                <b className="text-amber-600 font-black">
                  {retentionRisk.watch}
                </b>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  At risk
                </span>
                <b className="text-red-600 font-black">
                  {retentionRisk.atRisk}
                </b>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
              No learner records are available for retention analysis.
            </p>
          )}

          {hasLearners && (
            <div className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50/80 p-3 dark:border-amber-800/40 dark:bg-amber-950/30">
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
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2 text-start">Department</th>
                <th className="pb-2 text-center">Learners</th>
                <th className="pb-2 text-center">Active</th>
                <th className="pb-2 text-center">Mastery</th>
                <th className="pb-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {dept.departmentName}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {isSuppressed ? "< 3 (suppressed)" : dept.learners}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
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
                  <td colSpan={5} className="py-6 text-center text-slate-500">
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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Suggestion acceptance
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {aiCopilotPerformance.suggestionAcceptanceRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.suggestionAcceptanceRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {aiCopilotPerformance.suggestionTotal} module suggestions logged
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Prediction accuracy
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {aiCopilotPerformance.predictionAccuracyRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.predictionAccuracyRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {aiCopilotPerformance.predictionTotal} at-risk predictions
                validated
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Draft acceptance
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {aiCopilotPerformance.draftAcceptanceRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${aiCopilotPerformance.draftAcceptanceRate}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {aiCopilotPerformance.draftTotal} feedback drafts used
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Not enough usage data
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              AI Co-Pilot metrics will populate automatically as staff generate,
              edit, and validate suggestions.
            </p>
          </div>
        )}

        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 dark:bg-slate-800/40 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            How often staff accept AI suggestions, how accurate at-risk
            predictions proved, and how often AI feedback drafts were used — the
            trust signals behind the autonomy ceiling.
          </p>
        </div>
      </PCard>

      {/* 5. PLO Attainment Heatmap */}
      <PCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <AdminSectionHeader emoji="🗺️" title="PLO attainment heatmap" />
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger size="sm" className="text-xs font-bold">
              <SelectValue placeholder="Program: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Program: All</SelectItem>
              {(programsQuery.data?.data ?? []).map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Heatmap Grid */}
        {ploAttainment.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
            {ploAttainment.map((plo) => {
              const isUnmeasured =
                plo.meanAttainment < 0 || plo.statusBand === "unmeasured";
              let bgClass =
                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
              let textClass = "text-slate-800 dark:text-slate-100";

              if (!isUnmeasured) {
                if (plo.statusBand === "excellent") {
                  bgClass =
                    "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
                  textClass = "text-emerald-900 dark:text-emerald-100";
                } else if (plo.statusBand === "satisfactory") {
                  bgClass =
                    "bg-blue-100/90 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200";
                  textClass = "text-blue-900 dark:text-blue-100";
                } else if (plo.statusBand === "developing") {
                  bgClass =
                    "bg-amber-100/90 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
                  textClass = "text-amber-900 dark:text-amber-100";
                } else {
                  bgClass =
                    "bg-red-100/90 text-red-900 dark:bg-red-950/50 dark:text-red-200";
                  textClass = "text-red-900 dark:text-red-100";
                }
              }

              return (
                <div
                  key={plo.ploId}
                  className={`rounded-xl p-3 ${bgClass} transition-all`}
                >
                  <p className="text-[11px] font-bold truncate">
                    {plo.ploCodeTitle}
                  </p>
                  <p className={`text-xl font-black mt-1 ${textClass}`}>
                    {isUnmeasured ? "—" : `${plo.meanAttainment}%`}
                  </p>
                  <p className="text-[10px] opacity-80 mt-0.5 font-medium">
                    {plo.derivationLabel}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
            No live PLO attainment data is available.
          </p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            Excellent ≥85
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
            Satisfactory 70–84
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
            Developing 50–69
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-xs bg-red-500 inline-block" />
            Not yet &lt;50
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600 inline-block" />
            Unmeasured
          </span>
        </div>
      </PCard>
    </div>
  );
};

export default AdminAnalyticsPage;
