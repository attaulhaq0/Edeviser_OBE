// =============================================================================
// TeacherDashboardScreen — prototype rebuild (prototype-frontend-rebuild P2.2)
// =============================================================================
//
// Rebuilds `prototype/teacher-dashboard.html` on `@/design-system` + tokens,
// wired to the REAL existing hooks (no faked data, R17; no backend changes,
// G.1):
//   - useTeacherDashboardAggregate → kpis (avg mastery / to-grade / graded /
//                                    at-risk / students) + bloomsDistribution
//   - useAtRiskStudents  + useSendNudge        → "Do first · Student triage"
//   - useAtRiskPredictions + useSendAtRiskNudge → "At-risk · AI prediction"
//
// Pixel parity vs the prototype is proven by the owner's `npm run test:visual`
// gate (visual/screen-map.ts `teacher-dashboard`), then refined.
//
// DEFERRED / FLAGGED GAPS (prototype shows them, but no dashboard-level hook
// exists — adapted or omitted, never faked):
//   - Hero momentum slide (mastery-gain delta, on-time %, "saved by AI" hrs) and
//     schedule slide ("up next today") — no week-over-week / on-time / AI-time /
//     timetable data source. The hero renders slide 1 (greeting + real status
//     chips) only.
//   - "Curriculum Studio" micro-lesson counts + time-saved — no hook. Rendered
//     as a plain navigation entry (no fabricated stats).
//   - "Outcome Gaps" list + "Teaching impact" numbers — `useTeacherCLOAttainment`
//     / `useTeachingImpact` are course-scoped (need a courseId; team-scoped) with
//     no cross-course dashboard aggregate, and there is no `useTeacherCourses`
//     hook. Replaced at dashboard scope by the real, teacher-wide "Bloom's
//     coverage" (from bloomsDistribution).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  Clock,
  FolderOpen,
  GraduationCap,
  PenLine,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Button,
  HeroCarousel,
  KPICard,
  SectionHeader,
  Shimmer,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherDashboardAggregate } from "@/hooks/useTeacherDashboardAggregate";
import {
  useAtRiskStudents,
  useSendNudge,
  type AtRiskStudent,
} from "@/hooks/useTeacherDashboard";
import {
  useAtRiskPredictions,
  useSendAtRiskNudge,
  type AIAtRiskPrediction,
} from "@/hooks/useAtRiskPredictions";
import { attainmentValueClass } from "@/lib/attainmentTone";
import { getDisplayFirstName } from "@/lib/displayName";
import { cn } from "@/lib/utils";

const HERO_GRADIENT = "var(--hero-gradient)";

/** Canonical Bloom's-level dot colors (design-system domain coding). */
const BLOOM_DOT: Record<string, string> = {
  remembering: "bg-purple-500",
  understanding: "bg-blue-500",
  applying: "bg-green-500",
  analyzing: "bg-yellow-500",
  evaluating: "bg-orange-500",
  creating: "bg-red-500",
};

/** Up-to-two-letter initials from a display name (fail-safe). */
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Normalize a 0–1 probability OR an already-0–100 value to a whole percent. */
const asPercent = (n: number): number => Math.round(n <= 1 ? n * 100 : n) || 0;

// ─── Triage severity (derived from REAL AtRiskStudent fields, not faked) ──────

type Severity = "crit" | "att" | "mon";

const severityOf = (s: AtRiskStudent): Severity => {
  if (
    s.risk_reasons.length >= 2 ||
    s.days_inactive >= 14 ||
    s.low_clo_count >= 3
  )
    return "crit";
  if (s.days_inactive >= 7 || s.low_clo_count >= 2) return "att";
  return "mon";
};

const SEVERITY_STYLE: Record<
  Severity,
  { lead: string; pill: string; label: string }
> = {
  crit: {
    lead: "bg-red-50 text-red-600",
    pill: "bg-red-100 text-red-700 border-red-200",
    label: "Critical",
  },
  att: {
    lead: "bg-amber-50 text-amber-600",
    pill: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Attention",
  },
  mon: {
    lead: "bg-blue-50 text-blue-600",
    pill: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Monitor",
  },
};

// ─── AI-prediction contributing-signal chips (real ContributingSignals) ───────

interface SignalChip {
  icon: LucideIcon;
  label: string;
  tone: string;
}

const signalChips = (p: AIAtRiskPrediction): SignalChip[] => {
  const s = p.suggestion_data?.contributing_signals;
  if (!s) return [];
  const chips: SignalChip[] = [];
  const red = "text-red-700 bg-red-50 border-red-100";
  const amber = "text-amber-700 bg-amber-50 border-amber-100";
  const green = "text-green-700 bg-green-50 border-green-100";

  if (s.attainment_trend === "declining")
    chips.push({ icon: TrendingDown, label: "Declining", tone: red });
  else if (s.attainment_trend === "improving")
    chips.push({ icon: TrendingUp, label: "Improving", tone: green });
  else if (s.attainment_trend === "stagnant")
    chips.push({ icon: ArrowRight, label: "Stagnant", tone: amber });

  if (s.login_frequency === "low")
    chips.push({ icon: Clock, label: "Low logins", tone: amber });
  else if (s.login_frequency === "high")
    chips.push({ icon: Clock, label: "High logins", tone: green });

  if (s.submission_pattern === "missed")
    chips.push({ icon: XCircle, label: "Missed submission", tone: red });
  else if (s.submission_pattern === "late")
    chips.push({ icon: Clock, label: "Late submissions", tone: amber });

  return chips;
};

// ─── Small nav-tile used in the action/quick-links row ────────────────────────

const ActionTile = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-4xl border border-[#eef2f6] bg-white p-4 text-start shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] transition-transform active:scale-[.99]"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200/60 shadow-2xs backdrop-blur-xs text-teal-700">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="truncate text-[13px] font-bold text-gray-900">{title}</p>
      <p className="truncate text-xs text-gray-500">{subtitle}</p>
    </div>
    <ArrowRight
      className="ms-auto h-4 w-4 shrink-0 text-gray-300"
      aria-hidden="true"
    />
  </button>
);

const TeacherDashboardScreen = () => {
  const { t } = useTranslation("teacher");
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const aggregate = useTeacherDashboardAggregate(user?.id);
  const atRisk = useAtRiskStudents();
  const predictions = useAtRiskPredictions();
  const sendNudge = useSendNudge();
  const sendAtRiskNudge = useSendAtRiskNudge();

  const kpis = aggregate.data?.kpis;
  const blooms = aggregate.data?.bloomsDistribution ?? [];
  const avgAttainment = kpis?.avgAttainment ?? 0;
  const atRiskCount = kpis?.atRiskCount ?? 0;
  const pending = kpis?.pendingSubmissions ?? 0;
  const firstName =
    getDisplayFirstName(profile?.full_name) ??
    t("dashboard.teacherFallback", "Teacher");

  // ── Triage grouping (real data, derived severity, MAX 3 ON DASHBOARD) ──
  const [triTab, setTriTab] = useState<Severity | null>(null);
  const triageStudents = useMemo(() => atRisk.data ?? [], [atRisk.data]);
  const buckets = useMemo(() => {
    const b: Record<Severity, AtRiskStudent[]> = { crit: [], att: [], mon: [] };
    for (const s of triageStudents) b[severityOf(s)].push(s);
    return b;
  }, [triageStudents]);
  const visibleTriage = useMemo(() => {
    const list = triTab ? buckets[triTab] : triageStudents;
    return list.slice(0, 3);
  }, [triTab, buckets, triageStudents]);

  const nudge = (studentId: string, name: string) => {
    sendNudge.mutate(
      {
        studentId,
        message: t("dashboard.nudge.message", {
          defaultValue:
            "Your teacher noticed you might need support — let's get back on track.",
        }),
      },
      {
        onSuccess: () =>
          toast.success(
            t("dashboard.nudge.sent", {
              defaultValue: "Nudge sent to {{name}}",
              name,
            })
          ),
      }
    );
  };

  const predictionNudge = (studentId: string, name: string) => {
    sendAtRiskNudge.mutate(
      {
        studentId,
        message: t("dashboard.nudge.message", {
          defaultValue:
            "Your teacher noticed you might need support — let's get back on track.",
        }),
      },
      {
        onSuccess: () =>
          toast.success(
            t("dashboard.nudge.sent", {
              defaultValue: "Nudge sent to {{name}}",
              name,
            })
          ),
        onError: (err: unknown) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to send nudge"
          ),
      }
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* ── Hero carousel (briefing + real teaching momentum) ── */}
      <HeroCarousel
        ariaLabel={t("dashboard.hero.label", "Teaching highlights")}
        className="rounded-2xl text-white shadow-lg"
        style={{ background: HERO_GRADIENT }}
        slides={[
          <div key="briefing" className="relative min-h-29 p-4">
            <div
              className="pointer-events-none absolute -inset-e-8 -top-11 h-37.5 w-37.5"
              style={{
                background:
                  "radial-gradient(circle,rgba(20,184,166,.45),transparent 70%)",
              }}
            />
            <div className="relative flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <GraduationCap className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold tracking-tight">
                  {t("dashboard.greeting", "Good day, {{name}}", {
                    name: firstName,
                  })}{" "}
                  👋
                </h1>
                <p className="truncate text-[12px] text-white/70">
                  {t(
                    "dashboard.welcome.subtitle",
                    "Here's your teaching cockpit — nothing acts without your OK."
                  )}
                </p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-2">
              {atRiskCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    document
                      .getElementById("triage-sec")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="h-auto rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/25 hover:text-white"
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("dashboard.hero.needAttention", {
                    defaultValue: "{{n}} students need attention",
                    n: atRiskCount,
                  })}
                </Button>
              )}
              {pending > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/teacher/grading")}
                  className="h-auto rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/25 hover:text-white"
                >
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("dashboard.hero.toGrade", {
                    defaultValue: "{{n}} submissions to grade",
                    n: pending,
                  })}
                </Button>
              )}
            </div>
          </div>,
          <div key="momentum" className="flex min-h-29 items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
              <TrendingUp className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-200">
                {t("dashboard.hero.momentumEyebrow", "Teaching momentum")}
              </p>
              <h2 className="mt-0.5 text-lg font-bold">
                {t("dashboard.hero.mastery", {
                  defaultValue: "{{percent}}% average mastery",
                  percent: avgAttainment,
                })}
              </h2>
              <p className="mt-1 text-[12px] text-white/70">
                {t("dashboard.hero.momentumBody", {
                  defaultValue:
                    "{{graded}} graded this week · {{pending}} still in queue",
                  graded: kpis?.gradedThisWeek ?? 0,
                  pending,
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/teacher/gradebook")}
              className="shrink-0 rounded-xl border border-white/20 bg-white/15 px-3 text-xs font-bold text-white hover:bg-white/25 hover:text-white"
            >
              {t("dashboard.hero.openGradebook", "Open")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>,
        ]}
      />

      {/* ── KPI row (real aggregate metrics) ── */}
      {aggregate.isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-4xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard
            icon={Users}
            label={t("dashboard.totalStudents", "Students")}
            value={kpis?.totalStudents ?? 0}
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgAttainment", "Avg mastery")}
            value={`${avgAttainment}%`}
            valueClassName={attainmentValueClass(avgAttainment)}
            iconBgClass="bg-green-50"
            iconColorClass="text-green-600"
          />
          <KPICard
            icon={PenLine}
            label={t("dashboard.pendingSubmissions", "To grade")}
            value={pending}
            iconBgClass="bg-teal-50"
            iconColorClass="text-teal-600"
          />
          <KPICard
            icon={AlertTriangle}
            label={t("dashboard.atRiskStudents", "At-risk")}
            value={atRiskCount}
            valueClassName={atRiskCount > 0 ? "text-red-600" : "text-sky-700"}
            iconBgClass={atRiskCount > 0 ? "bg-red-50" : "bg-blue-50"}
            iconColorClass={atRiskCount > 0 ? "text-red-600" : "text-blue-600"}
          />
        </div>
      )}

      {/* ── Do first · Student triage (useAtRiskStudents) ── */}
      <section id="triage-sec">
        <SectionHeader
          icon={AlertTriangle}
          title={t("dashboard.triage.title", "Do first · Student triage")}
          action={
            <button
              type="button"
              onClick={() => navigate("/teacher/students")}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              {t("dashboard.triage.all", "View all students →")}
            </button>
          }
          className="mb-3"
        />

        {/* Priority tabs (click again to clear the filter) */}
        {triageStudents.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {(["crit", "att", "mon"] as const).map((key) => {
              const style = SEVERITY_STYLE[key];
              const active = triTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTriTab(active ? null : key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-slate-50"
                  )}
                >
                  {style.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-black",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-gray-600"
                    )}
                  >
                    {buckets[key].length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {atRisk.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Shimmer key={i} className="h-28 rounded-4xl" />
            ))}
          </div>
        ) : atRisk.isError ? (
          <div className="rounded-4xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {t("dashboard.triage.error", "Couldn't load student triage.")}
          </div>
        ) : visibleTriage.length > 0 ? (
          <div className="space-y-2.5">
            {visibleTriage.map((s) => {
              const sev = severityOf(s);
              const style = SEVERITY_STYLE[sev];
              return (
                <div
                  key={s.id}
                  className="student-triage-row flex flex-col gap-3 rounded-2xl border border-[#eef2f6] bg-white p-3.5 shadow-xs transition-all hover:border-slate-200 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black",
                        style.lead
                      )}
                    >
                      {initials(s.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {s.full_name}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0",
                            style.pill
                          )}
                        >
                          {style.label}
                        </span>
                      </div>
                      {s.risk_reasons.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-gray-600">
                          {s.risk_reasons.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="tactile"
                      className="h-8 px-3 text-xs flex-1 sm:flex-none justify-center"
                      disabled={sendNudge.isPending}
                      onClick={() => nudge(s.id, s.full_name)}
                      aria-label={`Send nudge to ${s.full_name}`}
                    >
                      <Bell className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                      {t("dashboard.triage.nudge", "Send nudge")}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs flex-1 sm:flex-none justify-center"
                      onClick={() => navigate("/teacher/students")}
                      aria-label={`View ${s.full_name}`}
                    >
                      {t("dashboard.triage.view", "View student")}
                    </Button>
                  </div>
                </div>
              );
            })}

            {triageStudents.length > 3 && (
              <div className="pt-1 text-end">
                <button
                  type="button"
                  onClick={() => navigate("/teacher/students")}
                  className="text-xs font-extrabold text-blue-600 hover:underline"
                >
                  {t("dashboard.triage.viewAllCount", {
                    defaultValue: "View all {{count}} at-risk students →",
                    count: triageStudents.length,
                  })}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-4xl border border-[#eef2f6] bg-white p-6 text-center text-sm text-gray-500 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]">
            {t(
              "dashboard.triage.empty",
              "No students flagged — everyone's on track."
            )}
          </div>
        )}
      </section>

      {/* ── At-risk · AI prediction  +  Bloom's coverage ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* At-risk students · AI prediction (useAtRiskPredictions) */}
        <div className="rounded-4xl border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]">
          <SectionHeader
            icon={AlertTriangle}
            title={t("dashboard.prediction.title", "Student risk signals")}
            action={
              predictions.data && predictions.data.length > 0 ? (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  {t("dashboard.prediction.flagged", {
                    defaultValue: "{{n}} AI model flagged",
                    n: predictions.data.length,
                  })}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Standard rules active
                </span>
              )
            }
          />
          <div className="mt-3">
            {predictions.isPending ? (
              <Shimmer className="h-40 rounded-xl" />
            ) : predictions.isError ? (
              <p className="py-6 text-center text-sm text-red-600">
                {t("dashboard.prediction.error", "Couldn't load predictions.")}
              </p>
            ) : predictions.data && predictions.data.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {predictions.data.slice(0, 5).map((p) => {
                  const risk = asPercent(
                    p.suggestion_data?.probability_score ?? 0
                  );
                  const current = p.suggestion_data?.current_attainment;
                  const riskTone =
                    risk >= 70
                      ? "text-red-600"
                      : risk >= 50
                      ? "text-amber-600"
                      : "text-slate-600";
                  const chips = signalChips(p);
                  return (
                    <div key={p.id} className="py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black",
                            risk >= 70
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-600"
                          )}
                        >
                          {initials(p.student_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {p.student_name}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {p.suggestion_data?.at_risk_clo_title ??
                              t(
                                "dashboard.prediction.outcome",
                                "At-risk outcome"
                              )}
                            {current != null && (
                              <>
                                {" · "}
                                {t("dashboard.prediction.now", {
                                  defaultValue: "now {{p}}%",
                                  p: asPercent(current),
                                })}
                              </>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-black",
                            riskTone
                          )}
                        >
                          {risk}%
                        </span>
                      </div>
                      {chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips.map((chip) => (
                            <span
                              key={chip.label}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                chip.tone
                              )}
                            >
                              <chip.icon
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2.5 flex gap-2">
                        <Button
                          variant="tactile"
                          className="h-8 px-3 text-xs"
                          disabled={sendAtRiskNudge.isPending}
                          onClick={() =>
                            predictionNudge(p.student_id, p.student_name)
                          }
                        >
                          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("dashboard.triage.nudge", "Send nudge")}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => navigate("/teacher/students")}
                        >
                          {t("dashboard.triage.view", "View student")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-xs font-bold text-slate-700">
                  {t(
                    "dashboard.prediction.emptyTitle",
                    `Rule-based risk: ${triageStudents.length} students flagged`
                  )}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    "dashboard.prediction.emptySubtitle",
                    "AI predictive model: Not configured · Active signals are tracked via standard attendance & CLO rules."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bloom's coverage (real bloomsDistribution — teacher-wide) */}
        <div className="rounded-4xl border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]">
          <SectionHeader
            icon={Brain}
            title={t("dashboard.bloomsDistribution", "Bloom's coverage")}
            action={
              <button
                type="button"
                onClick={() => navigate("/teacher/clos")}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.blooms.manage", "Manage CLOs →")}
              </button>
            }
          />
          <div className="mt-3">
            {aggregate.isPending ? (
              <Shimmer className="h-40 rounded-xl" />
            ) : blooms.length > 0 ? (
              <ul className="space-y-2.5">
                {blooms.map((row) => (
                  <li
                    key={row.level}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        BLOOM_DOT[row.level] ?? "bg-slate-400"
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 capitalize text-gray-700">
                      {row.level}
                    </span>
                    <span className="font-black text-gray-900">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                {t("dashboard.noClosDefined", "No CLOs defined yet.")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions (real routes; prototype action-row entry points) ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile
          icon={PenLine}
          title={t("dashboard.actions.feedback.title", "Approve AI feedback")}
          subtitle={
            pending > 0
              ? t("dashboard.actions.feedback.count", {
                  defaultValue: "{{n}} in the grading queue",
                  n: pending,
                })
              : t("dashboard.actions.feedback.clear", "Queue is clear")
          }
          onClick={() => navigate("/teacher/grading")}
        />
        <ActionTile
          icon={BookOpen}
          title={t("dashboard.actions.gradebook.title", "Gradebook")}
          subtitle={t(
            "dashboard.actions.gradebook.subtitle",
            "Marks & mastery"
          )}
          onClick={() => navigate("/teacher/gradebook")}
        />
        <ActionTile
          icon={FolderOpen}
          title={t(
            "dashboard.actions.curriculum.title",
            "Curriculum & modules"
          )}
          subtitle={t(
            "dashboard.actions.curriculum.subtitle",
            "Course content"
          )}
          onClick={() => navigate("/teacher/modules")}
        />
        <ActionTile
          icon={Clock}
          title={t("dashboard.actions.timetable.title", "Today's classes")}
          subtitle={t("dashboard.actions.timetable.subtitle", "View timetable")}
          onClick={() => navigate("/teacher/timetable")}
        />
      </div>

      {/* ── Autonomy footer (static policy chrome — A2) ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
          {t("dashboard.autonomy.note", {
            defaultValue:
              "AI autonomy: A2 — Suggest & approve. AI never sends, grades, or messages without your click.",
          })}
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboardScreen;
