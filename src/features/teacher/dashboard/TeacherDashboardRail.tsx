// =============================================================================
// TeacherDashboardRail — the teacher dashboard's right rail (prototype
// `railHTML()` teacher case in shared.js). Fixed, laptop-only (xl+) companion
// column mirroring the prototype's stack:
//   AI prepared your day · At-risk students · Class pulse · Curriculum Studio.
//
// Wired to the REAL teacher hooks the dashboard already uses (cache hits; no
// faked data, R17; no backend changes, G.1):
//   - useTeacherDashboardAggregate → kpis (avg mastery / to-grade / graded /
//                                    at-risk / students)
//   - useAtRiskStudents            → the at-risk list
//
// FLAGGED GAPS (prototype shows them, no backend exists — adapted or omitted,
// never faked):
//   - "AI prepared your day" per-item TIME ESTIMATES ("5 min", "~14 min") have
//     no source, so the card lists the real work to do (counts from kpis) with
//     no fabricated durations.
//   - "Curriculum Studio" micro-lesson draft COUNT has no hook, so it renders as
//     a plain navigation entry (no fabricated stats).
//
// Styling via the shared `RailCard`/`RailHead`/`RailRow` primitives (1:1 with
// prototype `.rail-card`/`.rail-h`/`.rail-row`).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherDashboardAggregate } from "@/hooks/useTeacherDashboardAggregate";
import {
  useAtRiskStudents,
  type AtRiskStudent,
} from "@/hooks/useTeacherDashboard";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
    >
      {label}
    </button>
  );
};

/** Critical (red dot) when multiple/severe signals, else attention (amber). */
const isCritical = (s: AtRiskStudent): boolean =>
  s.risk_reasons.length >= 2 || s.days_inactive >= 14 || s.low_clo_count >= 3;

/** Compact metric for an at-risk row: days inactive if known, else low-CLO count. */
const riskMetric = (s: AtRiskStudent): string =>
  s.days_inactive > 0 && s.days_inactive < 999
    ? `${s.days_inactive}d`
    : `${s.low_clo_count} CLOs`;

const TeacherDashboardRail = () => {
  const { t } = useTranslation("teacher");
  const { user } = useAuth();

  const aggregate = useTeacherDashboardAggregate(user?.id);
  const atRisk = useAtRiskStudents();

  const kpis = aggregate.data?.kpis;
  const pending = kpis?.pendingSubmissions ?? 0;
  const atRiskCount = kpis?.atRiskCount ?? 0;
  const avgAttainment = kpis?.avgAttainment ?? 0;
  const gradedThisWeek = kpis?.gradedThisWeek ?? 0;
  const totalStudents = kpis?.totalStudents ?? 0;

  const topAtRisk = (atRisk.data ?? []).slice(0, 3);

  return (
    <aside
      aria-label={t("dashboard.rail.label", "Your day")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── AI prepared your day (real work counts; no fabricated durations) ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.yourDay", "🤖 Your day")} />
        {aggregate.isPending ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : pending > 0 || atRiskCount > 0 ? (
          <div className="space-y-0.5">
            {pending > 0 && (
              <RailRow>
                <span aria-hidden="true">✍️</span>
                <span className="min-w-0 flex-1">
                  {t("dashboard.rail.toGrade", {
                    defaultValue: "Grade {{n}} submissions",
                    n: pending,
                  })}
                </span>
              </RailRow>
            )}
            {atRiskCount > 0 && (
              <RailRow>
                <span aria-hidden="true">🩺</span>
                <span className="min-w-0 flex-1">
                  {t("dashboard.rail.checkAtRisk", {
                    defaultValue: "Check {{n}} at-risk students",
                    n: atRiskCount,
                  })}
                </span>
              </RailRow>
            )}
            <RailLink
              to="/teacher/grading"
              label={t("dashboard.rail.openQueue", "Open grading queue →")}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.dayClear", "You're all caught up for today.")}
          </p>
        )}
      </RailCard>

      {/* ── At-risk students ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.atRisk", "At-risk students")}
          right={atRiskCount > 0 ? String(atRiskCount) : undefined}
        />
        {atRisk.isPending ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : topAtRisk.length > 0 ? (
          <div className="space-y-0.5">
            {topAtRisk.map((s) => (
              <RailRow key={s.id}>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    isCritical(s) ? "bg-red-500" : "bg-amber-500"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{s.full_name}</span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {riskMetric(s)}
                </b>
              </RailRow>
            ))}
            <RailLink
              to="/teacher/gradebook"
              label={t("dashboard.rail.viewAllAtRisk", "View all at-risk →")}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.atRiskEmpty", "Everyone's on track.")}
          </p>
        )}
      </RailCard>

      {/* ── Class pulse ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.classPulse", "📊 Class pulse")} />
        {aggregate.isPending ? (
          <Shimmer className="h-20 rounded-lg" />
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.avgMastery", "Avg mastery")}
              </span>
              <b className="text-[12px] font-extrabold text-green-600">
                {avgAttainment}%
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.toGradeLabel", "To grade")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {pending}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.gradedThisWeek", "Graded this week")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {gradedThisWeek}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.students", "Students")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {totalStudents}
              </b>
            </RailRow>
          </>
        )}
      </RailCard>

      {/* ── Curriculum Studio (nav only — draft counts are a flagged gap) ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.curriculumStudio", "🧬 Curriculum Studio")}
          right={t("dashboard.rail.new", "NEW")}
        />
        <p className="text-xs text-slate-500">
          {t(
            "dashboard.rail.curriculumBody",
            "Draft and organize modules and lessons for your courses."
          )}
        </p>
        <RailLink
          to="/teacher/modules"
          label={t("dashboard.rail.openCurriculum", "Open Curriculum →")}
        />
      </RailCard>
    </aside>
  );
};

export default TeacherDashboardRail;
