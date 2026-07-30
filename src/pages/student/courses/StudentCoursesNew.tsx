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
import { CalendarClock, CircleAlert, FileText, Sparkles } from "lucide-react";
import { format, isAfter, isThisWeek, isToday, startOfDay } from "date-fns";

import { Button, PCard, Shimmer } from "@/design-system";
import { useStudentAssignments } from "@/hooks/useSubmissions";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { useAuth } from "@/hooks/useAuth";
import { resolveCourseColor } from "@/lib/courseColor";
import type { StudentAssignment } from "@/hooks/useSubmissions";
import type { EnrolledCourseCard } from "@/lib/studentCourseCards";

const isSubmitted = (assignment: StudentAssignment): boolean =>
  (assignment.submissions?.length ?? 0) > 0;

const assignmentDue = (assignment: StudentAssignment): Date | null => {
  const due = new Date(assignment.due_date);
  return Number.isNaN(due.getTime()) ? null : due;
};

const CompactCourseCard = ({ course }: { course: EnrolledCourseCard }) => {
  const { t } = useTranslation("student");
  const progress = Math.max(
    0,
    Math.min(100, Math.round(course.progress_percent))
  );
  const accent = resolveCourseColor(course.color, course.id);

  return (
    <Link
      to={`/student/courses/${course.id}`}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PCard className="p-4 transition-transform hover:-translate-y-0.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <p className="truncate text-sm font-bold text-foreground">
              {course.name}
            </p>
          </div>
          <span className="shrink-0 text-sm font-black text-blue-600">
            {progress}%
          </span>
        </div>
        <div
          aria-label={t(
            "courses.progressLabel",
            "Course progress: {{percent}}%",
            {
              percent: progress,
            }
          )}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "var(--brand-gradient)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {course.next_assignment
              ? t("courses.nextAssignment", {
                  defaultValue: "Next: {{assignment}}",
                  assignment: course.next_assignment.title,
                })
              : t("courses.noUpcomingWork", "No upcoming work")}
          </p>
          <span className="shrink-0 text-xs font-bold text-blue-600">
            {t("courses.continue", "Continue →")}
          </span>
        </div>
      </PCard>
    </Link>
  );
};

const AssignmentRow = ({ assignment }: { assignment: StudentAssignment }) => {
  const { t } = useTranslation("student");
  const due = assignmentDue(assignment);

  return (
    <Link
      to={`/student/assignments/${assignment.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-card"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
          <FileText className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {assignment.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {due
              ? format(due, "EEEE · MMM d")
              : t("courses.noDueDate", "No due date")}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-amber-600">
        {t("courses.marks", {
          defaultValue: "{{count}} marks",
          count: assignment.total_marks,
        })}
      </span>
    </Link>
  );
};

const StudentCoursesNew = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const courses = useStudentCourses(user?.id);
  const assignments = useStudentAssignments();

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("courses.tasksTitle", "Courses & Tasks")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t(
              "courses.subtitle",
              "View your enrolled courses, progress, and assignments."
            )}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="due-today-heading">
          <div className="mb-3 flex items-center gap-2">
            <CircleAlert
              className="size-3.5 text-amber-500"
              aria-hidden="true"
            />
            <h2
              id="due-today-heading"
              className="text-xs font-black uppercase tracking-widest text-amber-600"
            >
              {t("courses.dueToday", {
                defaultValue: "Due today ({{count}})",
                count: taskGroups.dueToday.length,
              })}
            </h2>
          </div>
          {assignments.isLoading ? (
            <Shimmer className="h-44 rounded-2xl" />
          ) : dueToday ? (
            <PCard className="border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 dark:from-amber-950/20 dark:to-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    {assignmentDue(dueToday)
                      ? t("courses.dueAt", {
                          defaultValue: "Due {{time}}",
                          time: format(assignmentDue(dueToday) as Date, "p"),
                        })
                      : t("courses.dueTodayShort", "Due today")}
                  </span>
                  <h3 className="mt-2 text-base font-black leading-tight text-foreground">
                    {dueToday.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("courses.assignmentMarks", {
                      defaultValue: "{{count}} marks",
                      count: dueToday.total_marks,
                    })}
                  </p>
                </div>
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <FileText className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3.5 flex gap-2">
                <Button asChild variant="tactile" className="flex-1">
                  <Link to={`/student/assignments/${dueToday.id}`}>
                    {t("courses.submitNow", "Open assignment →")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/student/tutor">
                    {t("courses.getHelp", "Get help")}
                  </Link>
                </Button>
              </div>
            </PCard>
          ) : (
            <PCard className="p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-teal-600" aria-hidden="true" />
                {t("courses.noDueToday", "Nothing is due today.")}
              </div>
            </PCard>
          )}
        </section>

        <section aria-labelledby="this-week-heading">
          <h2
            id="this-week-heading"
            className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground"
          >
            {t("courses.thisWeek", {
              defaultValue: "This week ({{count}})",
              count: taskGroups.thisWeek.length,
            })}
          </h2>
          {assignments.isLoading ? (
            <div className="space-y-2.5">
              <Shimmer className="h-16 rounded-xl" />
              <Shimmer className="h-16 rounded-xl" />
            </div>
          ) : taskGroups.thisWeek.length > 0 ? (
            <div className="space-y-2.5">
              {taskGroups.thisWeek.slice(0, 3).map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : (
            <PCard className="p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4" aria-hidden="true" />
                {t("courses.noWeekTasks", "No other tasks due this week.")}
              </div>
            </PCard>
          )}
        </section>
      </div>

      <section aria-labelledby="my-courses-heading">
        <h2
          id="my-courses-heading"
          className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground"
        >
          {t("courses.title", "My Courses")}
        </h2>
        {courses.isLoading ? (
          <div className="grid gap-2.5 lg:grid-cols-2">
            <Shimmer className="h-28 rounded-2xl" />
            <Shimmer className="h-28 rounded-2xl" />
          </div>
        ) : courses.data && courses.data.length > 0 ? (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {courses.data.map((course) => (
              <CompactCourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <PCard className="p-6 text-center text-sm text-muted-foreground">
            {t("courses.noCourses", "You are not enrolled in any courses yet.")}
          </PCard>
        )}
      </section>

      {courses.isError || assignments.isError ? (
        <PCard className="p-4 text-sm text-destructive">
          {t(
            "courses.loadError",
            "Some course information could not be loaded. Please try again."
          )}
        </PCard>
      ) : null}
    </div>
  );
};

export default StudentCoursesNew;
