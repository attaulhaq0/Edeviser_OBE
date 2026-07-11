// =============================================================================
// StudentDashboardNew — redesigned student dashboard (P2, spec task 2.1)
// =============================================================================
//
// The "Today / gap → action" student dashboard, gated behind the
// `newUiDashboards` feature flag (see StudentDashboard.tsx wrapper). It REUSES
// the existing data hook `useStudentDashboardAggregate` (one round-trip, no new
// writes) and is composed entirely from the P0 primitives — WelcomeHero,
// KPICard, SectionHeader, MasteryRing, SeverityIcon, the tactile Button, and
// the `.card-elevated` surface.
//
// This is an incremental, flag-off-by-default build: it presents the core
// value (hero, next-step, KPIs, mastery, deadlines, tutor) with the new design.
// Richer gamification widgets remain on the legacy dashboard until this reaches
// full parity (task 2.6). i18n reuses existing `student` namespace keys.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  FileCheck,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WelcomeHero from "@/components/shared/WelcomeHero";
import KPICard from "@/components/shared/KPICard";
import SectionHeader from "@/components/shared/SectionHeader";
import MasteryRing from "@/components/shared/MasteryRing";
import { SeverityIcon } from "@/components/shared/SeverityIcon";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import { useStudentDashboardAggregate } from "@/hooks/useStudentDashboardAggregate";
import { formatNumber, formatPercent } from "@/lib/formatNumber";
import { formatLocalDate } from "@/lib/formatDate";
import { attainmentValueClass } from "@/lib/attainmentTone";

const StudentDashboardNew = () => {
  const { t } = useTranslation("student");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const studentId = user?.id ?? "";

  const aggregate = useStudentDashboardAggregate(studentId);
  const kpis = aggregate.data?.kpis;
  const deadlines = aggregate.data?.deadlines ?? [];
  const loading = aggregate.isPending;

  const avgAttainment = kpis?.avgAttainment ?? 0;
  const nextDeadline = deadlines[0];

  return (
    <div className="space-y-6">
      {/* Welcome hero with XP / Level / Streak */}
      <WelcomeHero
        name={profile?.full_name ?? "Student"}
        userRole="student"
        subtitle={t("dashboard.momentum")}
        stats={
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black">{kpis?.totalXP ?? 0}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                {t("dashboard.totalXP")}
              </p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">
                {t("dashboard.level", { level: kpis?.currentLevel ?? 1 })}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                {t("dashboard.levelLabel")}
              </p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">
                {kpis?.currentStreak ?? 0}🔥
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                {t("dashboard.streak")}
              </p>
            </div>
          </div>
        }
      />

      {/* Your next step (gap → action) */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="p-6">
          <SectionHeader
            icon={Target}
            title={t("dashboard.primaryCta.heading")}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <SeverityIcon
                icon={nextDeadline ? FileCheck : BookOpen}
                severity={nextDeadline ? "med" : "brand"}
                label={
                  nextDeadline
                    ? t("dashboard.primaryCta.submitAssignment.label")
                    : t("dashboard.primaryCta.continueCourse.label")
                }
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {nextDeadline
                    ? nextDeadline.title
                    : t("dashboard.primaryCta.continueCourse.label")}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {nextDeadline
                    ? `${nextDeadline.course_name} · ${formatLocalDate(
                        nextDeadline.due_date,
                        "MMM d"
                      )}`
                    : t("dashboard.primaryCta.continueCourse.description")}
                </p>
              </div>
            </div>
            <Button
              variant="tactile"
              className="shrink-0"
              onClick={() =>
                navigate(
                  nextDeadline
                    ? `/student/assignments/${nextDeadline.id}`
                    : "/student/courses"
                )
              }
            >
              {nextDeadline
                ? t("dashboard.primaryCta.submitAssignment.cta")
                : t("dashboard.primaryCta.continueCourse.cta")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            icon={BookOpen}
            label={t("dashboard.courses")}
            value={formatNumber(kpis?.enrolledCourses ?? 0)}
          />
          <KPICard
            icon={CheckCircle2}
            label={t("dashboard.completed")}
            value={formatNumber(kpis?.completedAssignments ?? 0)}
            iconBgClass="bg-green-50"
            iconColorClass="text-green-600"
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgAttainment")}
            value={formatPercent(avgAttainment)}
            valueClassName={attainmentValueClass(avgAttainment)}
          />
          <KPICard
            icon={Flame}
            label={t("dashboard.streak")}
            value={`${kpis?.currentStreak ?? 0}d`}
            iconBgClass="bg-orange-50"
            iconColorClass="text-orange-500"
          />
        </div>
      )}

      {/* Mastery snapshot + Upcoming deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mastery snapshot */}
        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="p-6">
            <SectionHeader
              icon={TrendingUp}
              title={t("dashboard.avgAttainment")}
            />
            <div className="mt-4 flex items-center gap-5">
              {loading ? (
                <Shimmer className="h-24 w-24 rounded-full" />
              ) : (
                <MasteryRing value={avgAttainment} size={96} tone="auto" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-600">
                  {t("dashboard.totalActiveDays", "Active days")}:{" "}
                  <span className="font-semibold text-gray-900">
                    {kpis?.totalActiveDays ?? 0}
                  </span>
                </p>
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0 text-sky-700"
                  onClick={() => navigate("/student/progress")}
                >
                  {t("dashboard.primaryCta.reviewFeedback.cta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="p-6">
            <SectionHeader
              icon={CalendarClock}
              title={t("dashboard.upcomingDeadlines")}
            />
            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Shimmer key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : deadlines.length > 0 ? (
                <ul className="space-y-2">
                  {deadlines.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/assignments/${d.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-slate-50"
                      >
                        <CalendarClock
                          className="h-4 w-4 shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {d.title}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {d.course_name}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-gray-400">
                          {formatLocalDate(d.due_date, "MMM d")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  {t("dashboard.noDeadlines", "No upcoming deadlines")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Tutor entry */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SeverityIcon
              icon={Bot}
              severity="brand"
              label={t("nav.aiTutor", { ns: "common" })}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t("nav.aiTutor", { ns: "common" })}
              </p>
              <p className="text-xs text-gray-500">
                {t(
                  "dashboard.tutorPrompt",
                  "Get unstuck with your AI study partner"
                )}
              </p>
            </div>
          </div>
          <Button
            variant="tactile"
            className="shrink-0"
            onClick={() => navigate("/student/tutor")}
          >
            {t("nav.aiTutor", { ns: "common" })}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboardNew;
