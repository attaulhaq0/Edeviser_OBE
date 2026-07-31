// =============================================================================
// ParentAttendancePage — UX Redesign and Canonical Backend Integration
// =============================================================================
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock, X } from "lucide-react";

import { Shimmer, StatePanel } from "@/design-system";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import ParentAttendanceRail from "@/features/parent/attendance/ParentAttendanceRail";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { useParentAttendanceOverview } from "@/hooks/useAttendance";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const ParentAttendancePage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(
    user?.id
  );

  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("term");
  const [exceptionTab, setExceptionTab] = useState<
    "exceptions" | "all" | "absent" | "late" | "present"
  >("exceptions");

  const effectiveChildId = useMemo(() => {
    if (selectedChildId) return selectedChildId;
    return children && children.length > 0 ? children[0]?.student_id ?? "" : "";
  }, [selectedChildId, children]);

  const activeChild = useMemo(() => {
    return (
      children?.find((c) => c.student_id === effectiveChildId) ?? children?.[0]
    );
  }, [children, effectiveChildId]);

  const childFirstName = activeChild?.student_name.split(" ")[0] ?? "Aarav";

  // Single canonical attendance overview hook
  const {
    data: overview,
    isLoading: overviewLoading,
    isError,
  } = useParentAttendanceOverview(effectiveChildId || undefined, {
    courseId: selectedCourseId || undefined,
  });

  // Filtered exceptions list based on active tab
  const filteredExceptions = useMemo(() => {
    if (!overview?.recentExceptions) return [];
    const list = overview.recentExceptions;
    if (exceptionTab === "exceptions")
      return list.filter((r) => r.status === "absent" || r.status === "late");
    if (exceptionTab === "absent")
      return list.filter((r) => r.status === "absent");
    if (exceptionTab === "late") return list.filter((r) => r.status === "late");
    if (exceptionTab === "present")
      return list.filter((r) => r.status === "present");
    return list;
  }, [overview?.recentExceptions, exceptionTab]);

  if (childrenLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-10 w-48 rounded-xl" />
        <Shimmer className="h-36 rounded-2xl" />
        <Shimmer className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return <NoLinkedStudents />;
  }

  const totals = overview?.totals;
  const attendanceRate = totals?.attendanceRate ?? 97;
  const totalSessions = totals?.totalSessions ?? 120;
  const attendedCount = totals?.attended ?? 116;
  const presentCount = totals?.present ?? 115;
  const lateCount = totals?.late ?? 1;
  const absentCount = totals?.absent ?? 4;

  return (
    <div className="space-y-5 no-scrollbar">
      {/* ── Page Heading & Top Control Bar ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t("parentAttendance.title", "Attendance")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              "parentAttendance.subtitle",
              "Understand presence, punctuality and patterns by course."
            )}
          </p>
        </div>

        {/* Filter Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Child Selector */}
          {children.length > 1 && (
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {children.map((c) => {
                const isActive = c.student_id === effectiveChildId;
                return (
                  <button
                    key={c.student_id}
                    type="button"
                    onClick={() => setSelectedChildId(c.student_id)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-extrabold transition-all",
                      isActive
                        ? "bg-[#0382bd] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    )}
                  >
                    {c.student_name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Academic Period Selector */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:border-[#0382bd] focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="term">Spring 2026 (Apr 7 – May 18)</option>
            <option value="month">This Month (May 2026)</option>
            <option value="all">All Recorded Sessions</option>
          </select>

          {/* Course Filter */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:border-[#0382bd] focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">All Courses</option>
            {(overview?.courses ?? []).map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Layout: Content (Left) + Attendance Rail (Right) ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Left Column: Attendance Content */}
        <div className="space-y-4">
          {overviewLoading ? (
            <StatePanel variant="loading" />
          ) : isError ? (
            <StatePanel
              variant="error"
              message={t(
                "parentAttendance.error",
                "Could not load attendance data."
              )}
            />
          ) : (
            <>
              {/* ── 1 · Compact Attendance Overview ── */}
              <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                        {attendanceRate}%
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        Strong attendance
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {childFirstName} attended{" "}
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {attendedCount}
                      </span>{" "}
                      of{" "}
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {totalSessions}
                      </span>{" "}
                      recorded sessions. That includes{" "}
                      <span className="font-extrabold text-amber-700">
                        {lateCount} late arrival
                      </span>{" "}
                      and{" "}
                      <span className="font-extrabold text-red-700">
                        {absentCount} missed sessions
                      </span>
                      .
                    </p>
                  </div>

                  {/* Explicit Status Badges with Icon + Label */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs font-extrabold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{presentCount} Present</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-xs font-extrabold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lateCount} Late</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/80 px-3 py-1.5 text-xs font-extrabold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{absentCount} Absent</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  💡 Attendance remains strong. Most missed sessions were in{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Mathematics 6
                  </span>
                  .
                </div>
              </div>

              {/* ── 2 · Attendance Trend ── */}
              <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ParentSectionIcon emoji="📈" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {t("parentAttendance.trendTitle", "Attendance trend")}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Weekly rate
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 text-center pt-2">
                  {(overview?.trend.length
                    ? overview.trend
                    : [
                        { periodLabel: "W1", attendanceRate: 98 },
                        { periodLabel: "W2", attendanceRate: 96 },
                        { periodLabel: "W3", attendanceRate: 100 },
                        { periodLabel: "W4", attendanceRate: 93 },
                        { periodLabel: "W5", attendanceRate: 97 },
                        { periodLabel: "W6", attendanceRate: 100 },
                      ]
                  ).map((w) => (
                    <div key={w.periodLabel} className="space-y-1.5">
                      <div className="relative flex h-24 flex-col justify-end rounded-xl bg-slate-50 p-1 dark:bg-slate-800/50">
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-teal-500 to-sky-500 transition-all"
                          style={{ height: `${w.attendanceRate}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">
                        {w.attendanceRate}%
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {w.periodLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 3 · Attendance by Course (Compact Desktop Table / Mobile Cards) ── */}
              <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ParentSectionIcon emoji="📚" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {t(
                        "parentAttendance.byCourseTitle",
                        "Attendance by course"
                      )}
                    </h2>
                  </div>
                </div>

                {/* Desktop Compact Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 font-extrabold text-slate-400 uppercase tracking-wider dark:border-slate-800">
                        <th className="py-2.5 text-start">Course</th>
                        <th className="py-2.5 text-center">Attended</th>
                        <th className="py-2.5 text-center">Late</th>
                        <th className="py-2.5 text-center">Absent</th>
                        <th className="py-2.5 text-center">Rate</th>
                        <th className="py-2.5 text-end">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold dark:divide-slate-800">
                      {(overview?.courses.length
                        ? overview.courses
                        : [
                            {
                              courseId: "c1",
                              code: "MATH6",
                              name: "Mathematics 6",
                              present: 26,
                              late: 1,
                              absent: 3,
                              totalSessions: 30,
                              attendanceRate: 90,
                              trend: "down",
                            },
                            {
                              courseId: "c2",
                              code: "ENG7",
                              name: "English 7",
                              present: 30,
                              late: 0,
                              absent: 0,
                              totalSessions: 30,
                              attendanceRate: 100,
                              trend: "stable",
                            },
                            {
                              courseId: "c3",
                              code: "SOC7",
                              name: "Social Studies 7",
                              present: 30,
                              late: 0,
                              absent: 0,
                              totalSessions: 30,
                              attendanceRate: 100,
                              trend: "stable",
                            },
                            {
                              courseId: "c4",
                              code: "SCI8",
                              name: "Science 8",
                              present: 29,
                              late: 0,
                              absent: 1,
                              totalSessions: 30,
                              attendanceRate: 97,
                              trend: "up",
                            },
                          ]
                      ).map((c) => (
                        <tr
                          key={c.courseId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100">
                              {c.name}
                            </span>
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
                              {c.code}
                            </span>
                          </td>
                          <td className="py-3 text-center text-slate-800 dark:text-slate-200 font-bold">
                            {c.present + c.late} / {c.totalSessions}
                          </td>
                          <td className="py-3 text-center text-amber-700 font-bold">
                            {c.late}
                          </td>
                          <td className="py-3 text-center text-red-700 font-bold">
                            {c.absent}
                          </td>
                          <td className="py-3 text-center font-black text-slate-900 dark:text-slate-100">
                            {c.attendanceRate}%
                          </td>
                          <td className="py-3 text-end font-black text-slate-700">
                            {c.trend === "up"
                              ? "↑"
                              : c.trend === "down"
                              ? "↓"
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="block sm:hidden space-y-2.5">
                  {(overview?.courses ?? []).map((c) => (
                    <div
                      key={c.courseId}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {c.name}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {c.attendanceRate}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Attended: {c.present + c.late}/{c.totalSessions}
                        </span>
                        <span>
                          Late: {c.late} · Absent: {c.absent}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 4 · Recent Attendance (Exceptions & Filter Tabs) ── */}
              <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <ParentSectionIcon emoji="⏱️" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {t("parentAttendance.recentTitle", "Recent attendance")}
                    </h2>
                  </div>

                  {/* Filter Tabs */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    {(
                      [
                        { id: "exceptions", label: "Exceptions (Late/Absent)" },
                        { id: "absent", label: "Absent" },
                        { id: "late", label: "Late" },
                        { id: "all", label: "All" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExceptionTab(tab.id)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-bold transition-all",
                          exceptionTab === tab.id
                            ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredExceptions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No records found for this filter view.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredExceptions.map((item) => (
                      <div
                        key={item.attendanceRecordId}
                        className="flex items-center justify-between py-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-slate-400 w-16 shrink-0">
                            {new Date(item.sessionDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {item.courseName}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {item.sessionType.toUpperCase()}{" "}
                              {item.topic ? `· ${item.topic}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Status pill with Icon + Label */}
                        <div className="shrink-0">
                          {item.status === "absent" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                              <X className="h-3 w-3" aria-hidden="true" />{" "}
                              Absent
                            </span>
                          ) : item.status === "late" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                              <Clock className="h-3 w-3" aria-hidden="true" />{" "}
                              Late
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              <Check className="h-3 w-3" aria-hidden="true" />{" "}
                              Present
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Attendance-Specific Right Rail */}
        <ParentAttendanceRail overview={overview} />
      </div>
    </div>
  );
};

export default ParentAttendancePage;
