// =============================================================================
// StudentCoursesNew — redesigned student "My Courses" list (P3, spec task 3.1)
// =============================================================================
//
// List-archetype course grid gated behind `newUiModules` (see the wrapper in
// StudentCoursesPage.tsx). REUSES the existing `useStudentCourses` hook
// (read-only, one batched round-trip, no new queries/writes) and the existing
// `CourseCard` (unchanged, so the flag-off path stays byte-identical). Adds an
// at-a-glance summary strip — average attainment (MasteryRing), course count,
// average progress, and upcoming-deadline count — all derived in memory from the
// same course list (no extra fetch). i18n reuses the `student` namespace via
// `t(key, default)` so it stays parity-safe.
// =============================================================================

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CalendarClock, TrendingUp } from "lucide-react";

import { Card, KPICard, MasteryRing, Shimmer } from "@/design-system";
import { NoCourses } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { attainmentValueClass } from "@/lib/attainmentTone";
import CourseCard from "./CourseCard";

const StudentCoursesNew = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data: courses, isLoading } = useStudentCourses(user?.id);

  const summary = useMemo(() => {
    const list = courses ?? [];
    const withAttainment = list.filter((c) => c.attainment_percent !== null);
    const avgAttainment =
      withAttainment.length > 0
        ? Math.round(
            withAttainment.reduce(
              (sum, c) => sum + (c.attainment_percent ?? 0),
              0
            ) / withAttainment.length
          )
        : 0;
    const avgProgress =
      list.length > 0
        ? Math.round(
            list.reduce((sum, c) => sum + c.progress_percent, 0) / list.length
          )
        : 0;
    const upcoming = list.filter(
      (c) => c.next_assignment?.due_at != null
    ).length;
    return {
      total: list.length,
      avgAttainment,
      avgProgress,
      upcoming,
    };
  }, [courses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("courses.title", "My Courses")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t(
            "courses.subtitle",
            "View your enrolled courses, progress, and assignments."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <NoCourses />
      ) : (
        <>
          {/* At-a-glance summary (derived in memory) */}
          <Card className="card-elevated overflow-hidden border-0 bg-white">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <MasteryRing
                  value={summary.avgAttainment}
                  size={96}
                  tone="auto"
                />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {t("progress.kpi.average", "Average")}
                  </p>
                  <p
                    className={`text-3xl font-black ${attainmentValueClass(
                      summary.avgAttainment
                    )}`}
                  >
                    {summary.avgAttainment}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 sm:ms-auto">
                <KPICard
                  icon={BookOpen}
                  label={t("courses.kpi.enrolled", "Courses")}
                  value={summary.total}
                  className="shadow-none ring-1 ring-slate-100"
                />
                <KPICard
                  icon={TrendingUp}
                  label={t("courses.progress", "Progress")}
                  value={`${summary.avgProgress}%`}
                  className="shadow-none ring-1 ring-slate-100"
                />
                <KPICard
                  icon={CalendarClock}
                  label={t("courses.kpi.upcoming", "Upcoming")}
                  value={summary.upcoming}
                  iconBgClass="bg-amber-50"
                  iconColorClass="text-amber-600"
                  className="shadow-none ring-1 ring-slate-100"
                />
              </div>
            </div>
          </Card>

          {/* Course grid (reuses the existing polished CourseCard) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentCoursesNew;
