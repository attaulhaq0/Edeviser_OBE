// Parent attendance: one query contract, shared surfaces, and explicit data states.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, BookOpen, CalendarDays, ClipboardList } from "lucide-react";
import {
  Badge,
  Button,
  Label,
  PageHeader,
  SectionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatePanel,
} from "@/design-system";
import { ParentAttendanceRail } from "@/features/parent";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { useParentAttendanceOverview } from "@/hooks/useAttendance";
import { cn } from "@/lib/utils";

const statusClasses = {
  present: "bg-(--success-subtle) text-(--success-foreground)",
  late: "bg-(--warning-subtle) text-(--warning-foreground)",
  absent: "bg-(--error-subtle) text-(--error-foreground)",
  excused: "bg-muted text-foreground",
};

const ParentAttendancePage = () => {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const childrenQuery = useLinkedChildren(user?.id);
  const children = childrenQuery.data;
  const [selectedChildId, setSelectedChildId] = useState("");
  const [courseSelection, setCourseSelection] = useState({ studentId: "", courseId: "" });
  const [exceptionTab, setExceptionTab] = useState<"exceptions" | "all" | "absent" | "late">("exceptions");
  const courseControlId = useId();
  const activeChild = children?.find((child) => child.student_id === selectedChildId) ?? children?.[0];
  const childId = activeChild?.student_id;
  // A course selection belongs to its child, including after linked-child cache changes.
  const selectedCourseId = courseSelection.studentId === childId ? courseSelection.courseId : "";
  const overviewQuery = useParentAttendanceOverview(childId, {
    courseId: selectedCourseId || undefined,
  });
  const overview = overviewQuery.data?.child.id === childId ? overviewQuery.data : undefined;
  const canSelectChild = !childrenQuery.isPending && !childrenQuery.isError && !!activeChild;
  const childrenUnavailable = !childrenQuery.isPending && !childrenQuery.isError && !children;
  const overviewUnavailable = canSelectChild && !overviewQuery.isPending && !overviewQuery.isError && !overview;
  const errorMessage = childrenQuery.isError
    ? t("parentAttendance.childrenError")
    : childrenUnavailable
      ? t("parentAttendance.childrenUnavailable")
      : canSelectChild && overviewQuery.isError
        ? t("parentAttendance.error")
        : overviewUnavailable
          ? t("parentAttendance.unavailable")
          : null;
  const retryQuery = childrenQuery.isError || childrenUnavailable ? childrenQuery : overviewQuery;
  const loading = childrenQuery.isPending || (canSelectChild && overviewQuery.isPending);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const numbers = new Intl.NumberFormat(locale);
  const percentages = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const dates = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
  const formatRate = (rate: number, measured: boolean) =>
    measured ? percentages.format(rate / 100) : t("parentAttendance.notMeasured");
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t("parentAttendance.notMeasured") : dates.format(date);
  };
  const filteredRecords = (overview?.recentExceptions ?? []).filter((record) => {
    if (exceptionTab === "exceptions") return record.status === "absent" || record.status === "late";
    return exceptionTab === "all" || record.status === exceptionTab;
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-2">
        <PageHeader title={t("parentAttendance.title")} />
        <p className="text-sm text-muted-foreground">{t("parentAttendance.subtitle")}</p>
      </div>

      {canSelectChild && (
        <div className="flex min-w-0 flex-wrap items-end gap-4">
          {children && children.length > 1 && (
            <div role="group" aria-label={t("parentAttendance.selectChild")} className="flex min-w-0 flex-1 flex-wrap gap-2">
              {children.map((child) => (
                <Button
                  key={child.student_id}
                  type="button"
                  variant="ghost"
                  aria-pressed={child.student_id === childId}
                  onClick={() => {
                    setSelectedChildId(child.student_id);
                    setCourseSelection({ studentId: child.student_id, courseId: "" });
                  }}
                  className={cn(
                    "h-auto min-h-11 max-w-full whitespace-normal break-words border px-4 py-2 text-start",
                    child.student_id === childId
                      ? "border-primary bg-accent text-accent-foreground hover:bg-accent dark:hover:bg-accent"
                      : "border-border bg-card text-foreground hover:bg-muted dark:hover:bg-muted"
                  )}
                >
                  {child.student_name}
                </Button>
              ))}
            </div>
          )}
          <div className="w-full space-y-2 sm:w-64">
            <Label htmlFor={courseControlId}>{t("parentAttendance.courseFilter")}</Label>
            <Select
              value={selectedCourseId || "all"}
              onValueChange={(value) => setCourseSelection({ studentId: childId ?? "", courseId: value === "all" ? "" : value })}
              disabled={!overview || overviewQuery.isPending || overviewQuery.isError}
            >
              <SelectTrigger id={courseControlId} className="min-h-11 w-full">
                <SelectValue placeholder={t("parentAttendance.allCourses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("parentAttendance.allCourses")}</SelectItem>
                {(overview?.courses ?? []).map((course) => (
                  <SelectItem key={course.courseId} value={course.courseId}>
                    {course.code} · {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t("parentAttendance.availableRecords")}</p>
        </div>
      )}

      {errorMessage ? (
        <div className="space-y-3">
          <StatePanel variant="error" message={errorMessage} />
          <Button variant="outline" className="min-h-11" onClick={() => void retryQuery.refetch()}>
            {t("buttons.retry")}
          </Button>
        </div>
      ) : loading ? (
        <StatePanel variant="loading" />
      ) : !activeChild ? (
        <StatePanel variant="empty" message={`${t("empty.noLinkedStudents.title")}. ${t("empty.noLinkedStudents.description")}`} />
      ) : overview ? (
        <>
          {overview.totals.totalSessions === 0 && (
            <StatePanel variant="empty" message={t("parentAttendance.noRecords")} />
          )}
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
            <div className="min-w-0 space-y-5">
              <section aria-label={t("parentAttendance.overviewTitle")}>
                <SectionCard icon={ClipboardList} title={t("parentAttendance.overviewTitle")}>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("parentAttendance.rate")}</p>
                      <p data-testid="attendance-rate" className="mt-1 break-words text-3xl font-bold tabular-nums text-foreground">
                        {formatRate(overview.totals.attendanceRate, overview.totals.totalSessions > 0)}
                      </p>
                    </div>
                    <p className="break-words text-sm text-muted-foreground">
                      {t("parentAttendance.summary", {
                        name: activeChild.student_name,
                        attended: numbers.format(overview.totals.attended),
                        total: numbers.format(overview.totals.totalSessions),
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(["present", "late", "absent", "excused"] as const).map((status) => (
                        <Badge key={status} variant="outline" className={cn("whitespace-normal text-start tabular-nums", statusClasses[status])}>
                          {t(`parentAttendance.status.${status}`)}: {numbers.format(overview.totals[status])}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </section>

              <section aria-label={t("parentAttendance.trendTitle")}>
                <SectionCard icon={BarChart3} title={t("parentAttendance.trendTitle")}>
                  {overview.trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("parentAttendance.noTrend")}</p>
                  ) : (
                    <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {overview.trend.map((period, index) => {
                        const measured = period.present + period.late + period.absent > 0;
                        const rate = formatRate(period.attendanceRate, measured);
                        const date = formatDate(period.periodStart);
                        return (
                          <li key={`${period.periodStart}-${index}`} className="min-w-0 space-y-2 text-center">
                            <div role="img" aria-label={t("parentAttendance.periodRate", { date, rate })} className="flex h-24 items-end overflow-hidden rounded-lg bg-muted">
                              {measured && <div data-testid="attendance-trend-fill" className="w-full rounded-lg bg-primary" style={{ height: `${period.attendanceRate}%` }} />}
                            </div>
                            <p className="break-words text-sm font-semibold tabular-nums text-foreground">{rate}</p>
                            <time dateTime={period.periodStart} className="block break-words text-xs text-muted-foreground">{date}</time>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </SectionCard>
              </section>

              <section aria-label={t("parentAttendance.byCourseTitle")}>
                <SectionCard icon={BookOpen} title={t("parentAttendance.byCourseTitle")}>
                  {overview.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("parentAttendance.noCourses")}</p>
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full text-start text-sm tabular-nums">
                          <caption className="sr-only">{t("parentAttendance.byCourseTitle")}</caption>
                          <thead className="border-b border-border text-muted-foreground">
                            <tr>
                              <th scope="col" className="py-3 pe-3 text-start font-medium">{t("parentAttendance.course")}</th>
                              <th scope="col" className="p-3 text-end font-medium">{t("parentAttendance.attended")}</th>
                              <th scope="col" className="p-3 text-end font-medium">{t("parentAttendance.status.late")}</th>
                              <th scope="col" className="p-3 text-end font-medium">{t("parentAttendance.status.absent")}</th>
                              <th scope="col" className="p-3 text-end font-medium">{t("parentAttendance.status.excused")}</th>
                              <th scope="col" className="py-3 ps-3 text-end font-medium">{t("parentAttendance.rate")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-foreground">
                            {overview.courses.map((course) => (
                              <tr key={course.courseId} className="hover:bg-muted/50">
                                <th scope="row" className="py-3 pe-3 text-start font-medium">
                                  <span className="block break-words">{course.name}</span>
                                  <span className="text-xs text-muted-foreground">{course.code}</span>
                                </th>
                                <td className="p-3 text-end">{numbers.format(course.present + course.late)} / {numbers.format(course.totalSessions)}</td>
                                <td className="p-3 text-end">{numbers.format(course.late)}</td>
                                <td className="p-3 text-end">{numbers.format(course.absent)}</td>
                                <td className="p-3 text-end">{numbers.format(course.excused)}</td>
                                <td className="py-3 ps-3 text-end font-semibold">{formatRate(course.attendanceRate, course.totalSessions > 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ul className="space-y-4 sm:hidden">
                        {overview.courses.map((course) => (
                          <li key={course.courseId} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
                            <p className="break-words font-semibold text-foreground">{course.name}</p>
                            <p className="text-xs text-muted-foreground">{course.code}</p>
                            <p className="text-sm tabular-nums text-foreground">{t("parentAttendance.rate")}: {formatRate(course.attendanceRate, course.totalSessions > 0)}</p>
                            <p className="text-sm tabular-nums text-muted-foreground">{t("parentAttendance.attended")}: {numbers.format(course.present + course.late)} / {numbers.format(course.totalSessions)}</p>
                            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {(["late", "absent", "excused"] as const).map((status) => (
                                <div key={status} className="flex gap-1"><dt>{t(`parentAttendance.status.${status}`)}:</dt><dd className="tabular-nums">{numbers.format(course[status])}</dd></div>
                              ))}
                            </dl>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </SectionCard>
              </section>

              <section aria-label={t("parentAttendance.recentTitle")}>
                <SectionCard icon={CalendarDays} title={t("parentAttendance.recentTitle")}>
                  <div role="group" aria-label={t("parentAttendance.recordFilter")} className="flex flex-wrap gap-2">
                    {(["exceptions", "absent", "late", "all"] as const).map((tab) => (
                      <Button
                        key={tab}
                        type="button"
                        variant="ghost"
                        aria-pressed={exceptionTab === tab}
                        onClick={() => setExceptionTab(tab)}
                        className={cn("h-auto min-h-11 whitespace-normal border px-3 py-2", exceptionTab === tab ? "border-primary bg-accent text-accent-foreground hover:bg-accent dark:hover:bg-accent" : "border-border text-foreground hover:bg-muted dark:hover:bg-muted")}
                      >
                        {t(tab === "exceptions" || tab === "all" ? `parentAttendance.filters.${tab}` : `parentAttendance.status.${tab}`)}
                      </Button>
                    ))}
                  </div>
                  {filteredRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("parentAttendance.noMatchingRecords")}</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredRecords.map((record) => (
                        <li key={record.attendanceRecordId} className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <time dateTime={record.sessionDate} className="text-xs text-muted-foreground">{formatDate(record.sessionDate)}</time>
                            <p className="break-words text-sm font-medium text-foreground">{record.courseName}</p>
                            <p className="break-words text-xs text-muted-foreground">{record.sessionType}{record.topic ? ` · ${record.topic}` : ""}</p>
                          </div>
                          <Badge variant="outline" className={cn("max-w-full whitespace-normal text-start", statusClasses[record.status] ?? "bg-muted text-foreground")}>
                            {t(`parentAttendance.status.${record.status}`, { defaultValue: record.status })}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </section>
            </div>
            <ParentAttendanceRail overview={overview} />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ParentAttendancePage;
