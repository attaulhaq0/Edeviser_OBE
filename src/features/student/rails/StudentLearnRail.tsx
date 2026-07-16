// =============================================================================
// StudentLearnRail — right rail for the student Learn/Courses pages (prototype
// `railHTML()` `page==='learn'||'course'` case in shared.js):
//   Course snapshot · Next deadline · Weakest CLO.
//
// Wired to the REAL hooks the courses surface already uses (cache hits; no faked
// data R17; no backend change G.1):
//   - useStudentCourses      → enrolled count + avg mastery
//   - useTodayViewData       → nearest upcoming deadline
//   - useCLOProgress         → weakest (lowest-attained) CLO
// GAP: the prototype's "Modules left" has no backing source, so that row is
// omitted rather than fabricated.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useTodayViewData } from "@/hooks/useTodayView";

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

const StudentLearnRail = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const courses = useStudentCourses(studentId);
  const cloProgress = useCLOProgress(studentId);
  const today = useTodayViewData(studentId);

  const cards = courses.data ?? [];
  const avgMastery = useMemo(() => {
    const vals = (courses.data ?? [])
      .map((c) => c.attainment_percent)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [courses.data]);

  const weakest = useMemo(() => {
    const entries = (cloProgress.data ?? [])
      .flatMap((c) => c.entries)
      .filter((e) => e.attainment_percent != null);
    if (entries.length === 0) return null;
    return entries.reduce((min, e) =>
      (e.attainment_percent as number) < (min.attainment_percent as number)
        ? e
        : min
    );
  }, [cloProgress.data]);

  const nextDeadline = today.deadlines[0];

  return (
    <aside
      aria-label={t("learn.rail.label", "Course snapshot")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Course snapshot ── */}
      <RailCard>
        <RailHead title={t("learn.rail.snapshot", "📚 Course snapshot")} />
        {courses.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("learn.rail.enrolled", "Enrolled")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {t("learn.rail.courseCount", {
                  defaultValue: "{{n}} courses",
                  n: cards.length,
                })}
              </b>
            </RailRow>
            {avgMastery != null && (
              <RailRow>
                <span className="min-w-0 flex-1">
                  {t("learn.rail.avgMastery", "Avg mastery")}
                </span>
                <b className="text-[12px] font-extrabold text-green-600">
                  {avgMastery}%
                </b>
              </RailRow>
            )}
          </>
        )}
      </RailCard>

      {/* ── Next deadline ── */}
      <RailCard>
        <RailHead title={t("learn.rail.nextDeadline", "⏰ Next deadline")} />
        {today.isLoading ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : nextDeadline ? (
          <>
            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
              {nextDeadline.title}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {nextDeadline.courseName}
            </p>
            <RailLink
              to={`/student/assignments/${nextDeadline.id}`}
              label={t("learn.rail.startNow", "Start now →")}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {t("learn.rail.noDeadlines", "Nothing due soon.")}
          </p>
        )}
      </RailCard>

      {/* ── Weakest CLO ── */}
      <RailCard>
        <RailHead title={t("learn.rail.weakestClo", "🎯 Weakest CLO")} />
        {cloProgress.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : weakest ? (
          <>
            <RailRow>
              <span className="min-w-0 flex-1 truncate">
                {weakest.clo_title}
              </span>
              <b className="text-[12px] font-extrabold text-amber-700">
                {Math.round(weakest.attainment_percent as number)}%
              </b>
            </RailRow>
            <RailLink
              to="/student/progress"
              label={t("learn.rail.fixIt", "Fix it on your path →")}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {t("learn.rail.noClo", "No outcome data yet.")}
          </p>
        )}
      </RailCard>
    </aside>
  );
};

export default StudentLearnRail;
