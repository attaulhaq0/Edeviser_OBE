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

  const recentGraded = [
    {
      id: "g1",
      title: "DB Assignment 2",
      course: "Database Design",
      date: "Jul 5",
      xp: "+25 XP",
      score: "92%",
    },
    {
      id: "g2",
      title: "Web Dev Lab 4",
      course: "Web Development",
      date: "Jul 3",
      xp: "+15 XP",
      score: "85%",
    },
    {
      id: "g3",
      title: "AI Quiz 1",
      course: "AI Fundamentals",
      date: "Jul 1",
      xp: "+10 XP",
      score: "78%",
    },
  ];

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

      <div className="w-full space-y-6">
        {/* Main Content Column */}
        <div className="space-y-6 min-w-0 w-full">
          {/* Due Today & This Week */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <section aria-labelledby="due-today-heading">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" />
                <h2
                  id="due-today-heading"
                  className="text-xs font-black uppercase tracking-widest text-amber-600"
                >
                  DUE TODAY ({taskGroups.dueToday.length || 1})
                </h2>
              </div>
              {assignments.isLoading ? (
                <Shimmer className="h-44 rounded-2xl" />
              ) : (
                <PCard className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        ⏰ DUE 5:00 PM · IN 4H
                      </span>
                      <h3 className="mt-2 text-base font-black leading-tight text-slate-900">
                        {dueToday ? dueToday.title : "Database Assignment 3"}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Database Design · Prof. Ahmed
                      </p>
                    </div>
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
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
                        Submit now → +25 XP
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

            <section aria-labelledby="this-week-heading">
              <h2
                id="this-week-heading"
                className="mb-2.5 text-xs font-black uppercase tracking-widest text-slate-400"
              >
                THIS WEEK ({taskGroups.thisWeek.length || 3})
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      Web Dev Quiz
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Wednesday · 15 marks
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-600">
                    +15 XP
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      AI Research Essay
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Friday · 30 marks
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-600">
                    +30 XP
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      SE Project Milestone
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Next Monday · 50 marks
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-600">
                    +50 XP
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* My Courses 2x2 Grid */}
          <section aria-labelledby="my-courses-heading">
            <h2
              id="my-courses-heading"
              className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400"
            >
              MY COURSES
            </h2>
            <div className="grid w-full min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Database Design
                    </h3>
                  </div>
                  <span className="text-sm font-black text-blue-600">72%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: "72%" }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Next: Assignment 3 (today) · Prof. Ahmed
                  </p>
                  <Link
                    to="/student/courses"
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Continue →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Web Development
                    </h3>
                  </div>
                  <span className="text-sm font-black text-blue-600">45%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: "45%" }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Next: Quiz (Wed) · Prof. Fatima
                  </p>
                  <Link
                    to="/student/courses"
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Continue →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-teal-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      AI Fundamentals
                    </h3>
                  </div>
                  <span className="text-sm font-black text-teal-600">88%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: "88%" }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Next: Essay (Fri) · Prof. Khalid
                  </p>
                  <Link
                    to="/student/courses"
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Continue →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Software Engineering
                    </h3>
                  </div>
                  <span className="text-sm font-black text-blue-600">30%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: "30%" }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Next: Milestone (Mon) · Prof. Noor
                  </p>
                  <Link
                    to="/student/courses"
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Continue →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Recently Graded */}
          <section aria-labelledby="recently-graded-heading">
            <PCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Check className="size-3.5 stroke-[3]" />
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
                {recentGraded.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.course} · {item.date} ·{" "}
                        <span className="text-emerald-600 font-bold">
                          {item.xp}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600">
                        {item.score}
                      </span>
                      <ChevronRight className="size-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </PCard>
          </section>
        </div>

        {/* Right Rail Column */}
        <div className="space-y-4">
          {/* Course Snapshot */}
          <PCard className="p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              📊 COURSE SNAPSHOT
            </p>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Enrolled</span>
                <span className="font-black text-slate-800">5 courses</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Avg mastery</span>
                <span className="font-black text-emerald-600">59%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Modules left</span>
                <span className="font-black text-slate-800">18</span>
              </div>
            </div>
          </PCard>

          {/* Next Deadline */}
          <PCard className="p-4 border-amber-100 bg-amber-50/40">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              🚨 NEXT DEADLINE
            </p>
            <h3 className="mt-2 text-sm font-black text-slate-900">
              DB Assignment 3
            </h3>
            <p className="text-[10px] text-slate-500">
              Due in 4 hours ·{" "}
              <span className="font-bold text-amber-600">+25 XP</span>
            </p>
            <Button
              asChild
              className="mt-3 w-full bg-cyan-600 text-white font-bold h-8 text-xs"
            >
              <Link to="/student/assignments">Start now →</Link>
            </Button>
          </PCard>

          {/* Weakest CLO */}
          <PCard className="p-4 border-rose-100 bg-rose-50/30">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">
              🎯 WEAKEST CLO
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Normalization</span>
              <span className="font-black text-rose-600">62%</span>
            </div>
            <Link
              to="/student/learning-path"
              className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline"
            >
              Fix it on your path →
            </Link>
          </PCard>
        </div>
      </div>
    </div>
  );
};

export default StudentCoursesNew;
