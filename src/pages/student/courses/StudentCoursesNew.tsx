// =============================================================================
// StudentCoursesNew — prototype `learn.html` rebuild
// =============================================================================
//
// Data binding audit (prototype-frontend-rebuild 3.1):
// - Due today / This week: useStudentAssignments (Wired)
// - My courses and per-course progress: useStudentCourses (Wired)
// - Recently graded percentage list: No-backend at this screen scope. The
//   student assignment hook exposes submission state but not a grade value, so
//   the prototype's demo results are deliberately omitted rather than faked.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, FileText } from "lucide-react";
import { isAfter, isThisWeek, isToday, startOfDay } from "date-fns";

import { Button, PCard, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { useStudentAssignments } from "@/hooks/useSubmissions";
import type { StudentAssignment } from "@/hooks/useSubmissions";

const isSubmitted = (assignment: StudentAssignment): boolean =>
  (assignment.submissions?.length ?? 0) > 0;

const assignmentDue = (assignment: StudentAssignment): Date | null => {
  const due = new Date(assignment.due_date);
  return Number.isNaN(due.getTime()) ? null : due;
};

const StudentCoursesNew = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const assignments = useStudentAssignments();
  const enrolledCourses = useStudentCourses(user?.id);

  const taskGroups = useMemo(() => {
    const today = startOfDay(new Date());
    const pending = (assignments.data ?? []).filter((assignment) => {
      const due = assignmentDue(assignment);
      return due !== null && !isSubmitted(assignment) && isAfter(due, today);
    });

    return {
      dueToday: pending.filter((assignment) => {
        const due = assignmentDue(assignment);
        return due !== null && isToday(due);
      }),
      thisWeek: pending.filter((assignment) => {
        const due = assignmentDue(assignment);
        return (
          due !== null && !isToday(due) && isThisWeek(due, { weekStartsOn: 1 })
        );
      }),
    };
  }, [assignments.data]);

  const dueToday = taskGroups.dueToday[0];

  const recentGraded = useMemo(
    () =>
      (assignments.data ?? [])
        .flatMap((assignment) =>
          (assignment.submissions ?? []).flatMap((submission) =>
            (submission.grades ?? []).map((grade) => ({
              id: grade.id,
              title: assignment.title,
              course:
                enrolledCourses.data?.find(
                  (course) => course.id === assignment.course_id
                )?.name ?? "",
              date: new Date(grade.graded_at).toLocaleDateString(),
              score: `${Math.round(grade.score_percent)}%`,
            }))
          )
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [assignments.data, enrolledCourses.data]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {t("courses.tasksTitle", "Courses & Tasks")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "courses.subtitle",
              "View your enrolled courses, progress, and assignments."
            )}
          </p>
        </div>
      </div>

      <div className="w-full space-y-6 min-w-0">
        {/* Urgent Work Area: Due Today & This Week */}
        <div className="tasks-priority-grid grid items-stretch gap-5 grid-cols-1 md:grid-cols-2">
          <section aria-labelledby="due-today-heading">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <h2
                id="due-today-heading"
                className="text-xs font-black uppercase tracking-widest text-amber-600"
              >
                DUE TODAY ({taskGroups.dueToday.length})
              </h2>
            </div>
            {assignments.isLoading ? (
              <Shimmer className="h-44 rounded-2xl" />
            ) : (
              <PCard className="border-amber-200 bg-linear-to-br from-amber-50/60 to-white p-4 shadow-sm h-[calc(100%-1.75rem)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        ⏰ DUE 5:00 PM · IN 4H
                      </span>
                      <h3 className="mt-2 text-base font-black leading-tight text-slate-900">
                        {dueToday?.title ?? "No incomplete work due today"}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dueToday
                          ? `${
                              enrolledCourses.data?.find(
                                (course) => course.id === dueToday.course_id
                              )?.name ?? ""
                            }`
                          : "Your live assignment queue is clear."}
                      </p>
                    </div>
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    asChild
                    variant="tactile"
                    className="flex-1 bg-cyan-600 text-white font-bold h-9"
                  >
                    <Link
                      to={
                        dueToday
                          ? `/student/assignments/${dueToday.id}`
                          : "/student/assignments"
                      }
                    >
                      {dueToday ? "Submit now" : "View all tasks"}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 border-teal-200 bg-teal-50 text-teal-700 font-bold"
                  >
                    <Link to="/student/tutor">🤖 Help</Link>
                  </Button>
                </div>
              </PCard>
            )}
          </section>

          <section
            aria-labelledby="this-week-heading"
            className="flex flex-col"
          >
            <h2
              id="this-week-heading"
              className="mb-2.5 text-xs font-black uppercase tracking-widest text-slate-400"
            >
              THIS WEEK ({taskGroups.thisWeek.length})
            </h2>
            <div className="space-y-2 flex-1">
              {taskGroups.thisWeek.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                  No incomplete assignments due this week.
                </div>
              ) : (
                taskGroups.thisWeek.map((assignment) => (
                  <Link
                    key={assignment.id}
                    to={`/student/assignments/${assignment.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-xs"
                  >
                    <span className="truncate text-xs font-bold text-slate-800">
                      {assignment.title}
                    </span>
                    <span className="ms-3 text-xs font-black text-amber-600">
                      {assignment.total_marks} marks
                    </span>
                  </Link>
                ))
              )}
            </div>
            <div className="mt-2.5 text-end">
              <Link
                to="/student/assignments"
                className="text-xs font-extrabold text-blue-600 hover:underline"
              >
                View all tasks →
              </Link>
            </div>
          </section>
        </div>

        {/* My Courses Full-Width Responsive Auto-Fit Grid */}
        <section aria-labelledby="my-courses-heading">
          <h2
            id="my-courses-heading"
            className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400"
          >
            MY COURSES
          </h2>
          {enrolledCourses.isLoading ? (
            <div className="grid w-full min-w-0 gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))]">
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="my-courses-grid grid w-full min-w-0 gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))]">
              {(enrolledCourses.data ?? []).map((c) => {
                const pct = c.attainment_percent ?? 0;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                pct >= 80
                                  ? "#0d9488"
                                  : pct >= 60
                                  ? "#2563eb"
                                  : "#d97706",
                            }}
                          />
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {c.name}
                          </h3>
                        </div>
                        <span className="text-sm font-black text-blue-600 shrink-0 ms-2">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct >= 80
                                ? "#0d9488"
                                : pct >= 60
                                ? "#2563eb"
                                : "#d97706",
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <p className="text-slate-400 text-[11px] truncate min-w-0 flex-1 me-2">
                        Next: {c.next_assignment?.title ?? "Assignment"}
                        {c.teacher_name ? ` · ${c.teacher_name}` : ""}
                      </p>
                      <Link
                        to={`/student/courses/${c.id}`}
                        className="font-bold text-blue-600 hover:underline shrink-0"
                      >
                        Continue →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recently Graded */}
        <section aria-labelledby="recently-graded-heading">
          <PCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Check className="size-3.5 stroke-3" />
                </span>
                <h2
                  id="recently-graded-heading"
                  className="text-xs font-black uppercase tracking-wider text-slate-900"
                >
                  Recently graded
                </h2>
              </div>
              <Link
                to="/student/grading"
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                All results →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentGraded.length === 0 ? (
                <p className="py-4 text-xs text-slate-500">
                  No released grades yet.
                </p>
              ) : (
                recentGraded.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.course} · {item.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600">
                        {item.score}
                      </span>
                      <ChevronRight className="size-4 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </PCard>
        </section>
      </div>
    </div>
  );
};

export default StudentCoursesNew;
