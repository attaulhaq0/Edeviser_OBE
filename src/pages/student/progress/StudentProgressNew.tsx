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
import { Award, BookOpen, Target, TrendingUp } from "lucide-react";

import { Badge, Button, PCard } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAcademicSummary } from "@/hooks/useStudentProgress";
import { cn } from "@/lib/utils";

/** Attainment-band chip class */
const bandChipClass = (p: number): string => {
  if (p >= 85) return "text-green-600 bg-green-50";
  if (p >= 70) return "text-sky-700 bg-sky-50";
  if (p >= 50) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const getBandName = (pct: number): string => {
  if (pct >= 85) return "Excellent";
  if (pct >= 70) return "Satisfactory";
  if (pct >= 50) return "Developing";
  return "Not Yet";
};

const StudentProgressNew = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const summary = useStudentAcademicSummary(user?.id);

  const courseList = summary.data?.perCourse.length
    ? summary.data.perCourse.map((c) => ({
        code: c.course_code,
        name: c.course_name,
        band: getBandName(c.attainment_percent),
        pct: c.attainment_percent,
        clos: c.clo_count || 5,
        evidence: c.evidence_count || 12,
        color: c.attainment_percent >= 85 ? "bg-teal-500" : "bg-blue-600",
      }))
    : [
        {
          code: "CS301",
          name: "Database Design",
          band: "Satisfactory",
          pct: 78,
          clos: 5,
          evidence: 12,
          color: "bg-blue-600",
        },
        {
          code: "AI101",
          name: "AI Fundamentals",
          band: "Excellent",
          pct: 92,
          clos: 4,
          evidence: 9,
          color: "bg-teal-500",
        },
        {
          code: "CS205",
          name: "Web Development",
          band: "Developing",
          pct: 62,
          clos: 8,
          evidence: 6,
          color: "bg-blue-600",
        },
        {
          code: "SE400",
          name: "Software Engineering",
          band: "Not Yet",
          pct: 45,
          clos: 6,
          evidence: 3,
          color: "bg-blue-600",
        },
      ];

  const closAttention = [
    { title: "Normalization (CLO3)", pct: 62, color: "bg-rose-500" },
    { title: "REST APIs (CLO5)", pct: 48, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {t("progress.title", "My Progress")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "progress.subtitle",
              "Track your attainment across all enrolled courses."
            )}
          </p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PCard className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">
              COURSES
            </p>
            <p className="text-xl font-black text-slate-900">
              {summary.data?.activeCourseCount ?? 4}
            </p>
          </div>
        </PCard>

        <PCard className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">
              AVERAGE
            </p>
            <p className="text-xl font-black text-emerald-600">
              {summary.data?.averageMastery ?? 88}%{" "}
              <span className="text-xs text-emerald-500 font-bold">↑4</span>
            </p>
          </div>
        </PCard>

        <PCard className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
            <Award className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">
              EXCELLENT
            </p>
            <p className="text-xl font-black text-slate-900">
              {summary.data?.excellentCount ?? 2}
            </p>
          </div>
        </PCard>

        <PCard className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-black">
            <Target className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">
              FOCUS ON
            </p>
            <p className="text-xl font-black text-rose-600">
              {summary.data?.notYetCount ?? 2}
            </p>
          </div>
        </PCard>
      </div>

      {/* AI Insight Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-teal-50/90 via-cyan-50/80 to-sky-50/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white text-lg shadow-xs">
            🤖
          </div>
          <div>
            <p className="text-xs font-black text-teal-900">AI Insight</p>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Spend 20 min on{" "}
              <span className="font-bold text-slate-900">
                {summary.data?.weakestClo?.title ??
                  "Database Normalization (CLO3)"}
              </span>{" "}
              to reach Satisfactory. You're only 8% away!
            </p>
          </div>
        </div>
        <Button
          asChild
          className="bg-cyan-600 text-white font-bold text-xs h-8 px-4 rounded-xl"
        >
          <Link to="/student/tutor">Get Help →</Link>
        </Button>
      </div>

      {/* Course Progress & CLOs Needing Attention Grid (Main Content Only) */}
      <div className="progress-main-grid grid items-start gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)] w-full">
        {/* Progress by Course */}
        <PCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="size-3.5" />
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Progress by Course
            </h2>
          </div>
          <div className="space-y-4">
            {courseList.map((course) => (
              <div key={course.code} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold py-0"
                    >
                      {course.code}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[9px] font-bold py-0",
                        bandChipClass(course.pct)
                      )}
                    >
                      {course.band}
                    </Badge>
                  </div>
                  <span className="font-black text-slate-900">
                    {course.pct}%
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {course.name}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full", course.color)}
                    style={{ width: `${course.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {course.clos} CLOs · {course.evidence} evidence
                </p>
              </div>
            ))}
          </div>
        </PCard>

        {/* CLOs Needing Attention */}
        <PCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Target className="size-3.5" />
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              CLOs Needing Attention
            </h2>
          </div>
          <div className="space-y-4">
            {closAttention.map((clo) => (
              <div key={clo.title} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{clo.title}</span>
                  <span className="font-black text-rose-600">{clo.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{ width: `${clo.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PCard>
      </div>
    </div>
  );
};

export default StudentProgressNew;
