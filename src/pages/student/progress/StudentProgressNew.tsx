// =============================================================================
// StudentProgressNew — redesigned student progress page (P3, spec task 3.1)
// =============================================================================
//
// Analytics-archetype attainment view gated behind `newUiModules` (see the
// wrapper in StudentProgressPage.tsx). REUSES the existing `useStudentProgress`
// hook (read-only, no new queries/writes) and is composed from the P0 primitives
// (SectionHeader, MasteryRing, KPICard, `.card-elevated`). i18n reuses the exact
// `student` namespace keys the legacy page references (all via `t(key, default)`
// so they stay parity-safe). Flag-off keeps the legacy page byte-identical.
//
// Presentation-only: the overall average becomes a prominent MasteryRing with an
// attainment-band breakdown, the KPI row is restyled via the shared KPICard, and
// each per-course row gains a compact MasteryRing while preserving the exact
// deep-link to `/student/courses/:id`.
// =============================================================================

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  ChevronRight,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  Badge,
  KPICard,
  MasteryRing,
  PCard,
  SectionHeader,
  Shimmer,
} from "@/design-system";
import { NoData } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { attainmentValueClass } from "@/lib/attainmentTone";

/** Attainment-band chip class (design-system attainment colors). Kept local:
 *  only the progress screens need it today (extract to `attainmentTone` if a
 *  third caller appears). */
const bandChipClass = (p: number): string => {
  if (p >= 85) return "text-green-600 bg-green-50";
  if (p >= 70) return "text-sky-700 bg-sky-50";
  if (p >= 50) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const StudentProgressNew = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data, isLoading } = useStudentProgress(user?.id);

  const bandLabel = (p: number): string => {
    if (p >= 85) return t("progress.level.excellent", "Excellent");
    if (p >= 70) return t("progress.level.satisfactory", "Satisfactory");
    if (p >= 50) return t("progress.level.developing", "Developing");
    return t("progress.level.notYet", "Not Yet");
  };

  const bands = data
    ? [
        {
          key: "excellent",
          label: t("progress.level.excellent", "Excellent"),
          count: data.excellentCount,
          tone: "text-green-600",
          dot: "bg-green-500",
        },
        {
          key: "satisfactory",
          label: t("progress.level.satisfactory", "Satisfactory"),
          count: data.satisfactoryCount,
          tone: "text-sky-700",
          dot: "bg-sky-500",
        },
        {
          key: "developing",
          label: t("progress.level.developing", "Developing"),
          count: data.developingCount,
          tone: "text-amber-600",
          dot: "bg-amber-500",
        },
        {
          key: "notYet",
          label: t("progress.level.notYet", "Not Yet"),
          count: data.notYetCount,
          tone: "text-red-600",
          dot: "bg-red-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        icon={TrendingUp}
        title={t("progress.title", "My Progress")}
        description={t(
          "progress.subtitle",
          "Track your attainment across all enrolled courses."
        )}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !data || data.totalCourses === 0 ? (
        <NoData />
      ) : (
        <>
          {/* Overall mastery summary */}
          <PCard className="overflow-hidden">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <MasteryRing
                  value={data.averageAttainment}
                  size={112}
                  strokeWidth={10}
                  tone="auto"
                />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {t("progress.kpi.average", "Average")}
                  </p>
                  <p
                    className={`text-3xl font-black ${attainmentValueClass(
                      data.averageAttainment
                    )}`}
                  >
                    {data.averageAttainment}%
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {data.totalCourses} {t("progress.kpi.courses", "Courses")}
                  </p>
                </div>
              </div>

              {/* Attainment-band breakdown */}
              <div className="grid grid-cols-2 gap-3 sm:ms-auto sm:grid-cols-4">
                {bands.map((b) => (
                  <div
                    key={b.key}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-center"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${b.dot}`}
                        aria-hidden="true"
                      />
                      <span className={`text-lg font-black ${b.tone}`}>
                        {b.count}
                      </span>
                    </span>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {b.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </PCard>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KPICard
              icon={BookOpen}
              label={t("progress.kpi.courses", "Courses")}
              value={data.totalCourses}
            />
            <KPICard
              icon={TrendingUp}
              label={t("progress.kpi.average", "Average")}
              value={`${data.averageAttainment}%`}
              valueClassName={attainmentValueClass(data.averageAttainment)}
            />
            <KPICard
              icon={Award}
              label={t("progress.kpi.excellent", "Excellent")}
              value={data.excellentCount}
              iconBgClass="bg-green-50"
              iconColorClass="text-green-600"
            />
            <KPICard
              icon={Target}
              label={t("progress.kpi.atRisk", "Not Yet")}
              value={data.notYetCount}
              valueClassName={
                data.notYetCount > 0 ? "text-red-600" : "text-sky-700"
              }
              iconBgClass="bg-red-50"
              iconColorClass="text-red-600"
            />
          </div>

          {/* Per-course list */}
          <PCard className="overflow-hidden">
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionHeader
                  icon={TrendingUp}
                  title={t("progress.byCourse", "Progress by Course")}
                  className="mb-0"
                />
                <Link
                  to="/student/progress/clos"
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <Target className="size-3.5" aria-hidden="true" />
                  {t("progress.viewCLOProgress")}
                  <ChevronRight
                    className="size-3.5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  to="/student/learning-path"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {t("learningPath.title")}
                  <ChevronRight
                    className="size-3.5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {data.perCourse.map((course) => (
                  <Link
                    key={course.course_id}
                    to={`/student/courses/${course.course_id}`}
                    className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <div className="group flex items-center gap-4 rounded-xl border border-slate-100 p-3 transition-colors hover:border-sky-200 hover:bg-slate-50">
                      <MasteryRing
                        value={course.attainment_percent}
                        size={52}
                        strokeWidth={6}
                        tone="auto"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold"
                          >
                            {course.course_code}
                          </Badge>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${bandChipClass(
                              course.attainment_percent
                            )}`}
                          >
                            {bandLabel(course.attainment_percent)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-foreground">
                          {course.course_name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {course.clo_count} {t("progress.clos", "CLOs")} ·{" "}
                          {course.evidence_count}{" "}
                          {t("progress.evidence", "evidence")}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-sky-500 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </PCard>
        </>
      )}
    </div>
  );
};

export default StudentProgressNew;
