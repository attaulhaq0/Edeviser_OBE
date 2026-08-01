// =============================================================================
// AdminAnalyticsPage — Institution Analytics (Prototype Parity & Real Backend)
// Rebuilds `prototype/admin-analytics.html` on `@/design-system` + tokens
// Requirements: 1, 2, 3, 4, 5
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Shimmer } from "@/design-system";
import {
  useAdminAnalytics,
  MIN_COHORT_THRESHOLD,
} from "@/hooks/useAdminAnalytics";

const AdminAnalyticsPage = () => {
  const { t } = useTranslation("common");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const { data: analytics, isLoading, error } = useAdminAnalytics();

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

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-bold">
          {t("common.errorLoading", "Failed to load analytics")}
        </p>
        <p className="text-xs mt-1">
          {error instanceof Error
            ? error.message
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
    aiCopilotPerformance,
    ploAttainment,
  } = analytics;

  const latestActive = weeklyActiveLearners[weeklyActiveLearners.length - 1];
  const activePillLabel = `${latestActive?.activePercent ?? 0}% ↑`;

  return (
    <div className="space-y-4 no-scrollbar">
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
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
              📈
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Weekly active learners
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            {activePillLabel}
          </span>
        </div>

        {/* 5-week Bar Chart */}
        <div className="flex items-end gap-2.5 h-28 border-b border-slate-100 dark:border-slate-800 pb-0">
          {weeklyActiveLearners.map((pt, idx) => {
            const isLatest = idx === weeklyActiveLearners.length - 1;
            const barHeightPct = Math.max(10, Math.min(pt.activePercent, 100));

            return (
              <div
                key={pt.week}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${barHeightPct}%`,
                    background: isLatest
                      ? "linear-gradient(180deg, #14b8a6, #0382bd)"
                      : "#3b82f6",
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
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
          <span>5-week trend · active learners / week</span>
          <span className="italic text-slate-400 font-medium">
            Real live Supabase data
          </span>
        </div>
      </div>

      {/* 2. Mastery Distribution & Retention Risk (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Mastery Distribution */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
              🎯
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Mastery distribution
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "Excellent", pct: masteryDistribution.excellentPercent },
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
        </div>

        {/* Retention Risk */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
              🔻
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Retention risk
            </p>
          </div>

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
              <b className="text-amber-600 font-black">{retentionRisk.watch}</b>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                At risk
              </span>
              <b className="text-red-600 font-black">{retentionRisk.atRisk}</b>
            </div>
          </div>

          <div className="mt-3 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 dark:bg-amber-950/30 dark:border-amber-800/40">
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              {retentionRisk.atRisk} of {retentionRisk.total} learners flagged
              at risk across course activities.{" "}
              <button
                type="button"
                onClick={() =>
                  toast.success("Outreach initiative logged", {
                    description:
                      "Outreach guidelines dispatched to department heads.",
                  })
                }
                className="font-bold underline text-amber-900 dark:text-amber-100 hover:text-amber-700 cursor-pointer"
              >
                Draft outreach
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Department Table */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
            🏫
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Departments
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
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
              {departments.map((dept) => {
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
                      {dept.trend === "up" ? "↑" : "↓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. AI Co-Pilot Performance */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
              🤖
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Co-Pilot performance
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
            A2 governance
          </span>
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
      </div>

      {/* 5. PLO Attainment Heatmap */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
              🗺️
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              PLO attainment heatmap
            </p>
          </div>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">Program: All</option>
          </select>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
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
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
