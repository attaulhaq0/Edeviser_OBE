import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";
import { format, isPast, addHours, formatDistanceToNow } from "date-fns";
import { ArrowRight, Calendar, Search } from "lucide-react";

import ErrorState from "@/components/shared/ErrorState";
import { Badge, Input, PCard, Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAssignments } from "@/hooks/useSubmissions";
import type { StudentAssignment } from "@/hooks/useSubmissions";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { cn } from "@/lib/utils";
import { NoAssignments } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssignmentStatus = "submitted" | "pending" | "late" | "overdue";

const getAssignmentStatus = (
  assignment: StudentAssignment
): AssignmentStatus => {
  if (assignment.submissions && assignment.submissions.length > 0) {
    const first = assignment.submissions[0]!;
    return first.is_late ? "late" : "submitted";
  }

  const dueDate = new Date(assignment.due_date);
  const lateDeadline = addHours(dueDate, assignment.late_window_hours);
  if (isPast(lateDeadline)) return "overdue";
  if (isPast(dueDate)) return "late";
  return "pending";
};

const statusConfig: Record<
  AssignmentStatus,
  { label: string; className: string }
> = {
  submitted: {
    label: "Submitted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  late: {
    label: "Late",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const AssignmentListScreen = () => {
  const { t } = useTranslation("student");
  const { profile } = useAuth();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const assignments = useStudentAssignments();
  const courses = useStudentCourses(profile?.id);

  const courseOptions = useMemo(
    () => (courses.data ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [courses.data]
  );

  const courseById = useMemo(() => {
    const next = new Map<string, (typeof courseOptions)[number]>();
    for (const course of courseOptions) next.set(course.id, course);
    return next;
  }, [courseOptions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (assignments.data ?? []).filter((assignment) => {
      if (courseFilter !== "all" && assignment.course_id !== courseFilter) {
        return false;
      }

      if (!query) return true;
      const course = courseById.get(assignment.course_id);
      return (
        assignment.title.toLowerCase().includes(query) ||
        course?.name.toLowerCase().includes(query) ||
        course?.code.toLowerCase().includes(query)
      );
    });
  }, [assignments.data, courseById, courseFilter, search]);

  const counts = useMemo(() => {
    const next = {
      submitted: 0,
      pending: 0,
      late: 0,
      overdue: 0,
    };
    for (const assignment of assignments.data ?? []) {
      const status = getAssignmentStatus(assignment);
      next[status] += 1;
    }
    return next;
  }, [assignments.data]);

  if (assignments.isError || courses.isError) {
    return (
      <ErrorState
        title={t("assignments.list.loadErrorTitle", "Assignments unavailable")}
        message={t(
          "assignments.list.loadError",
          "We couldn't load your assignments. Please try again."
        )}
        onRetry={() => {
          void assignments.refetch();
          void courses.refetch();
        }}
        retryLabel={t("common:buttons.retry", "Try again")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {t("assignments.list.title", "Assignments")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "assignments.list.subtitle",
            "Track upcoming work, late submissions, and what is already done."
          )}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {(
          [
            ["pending", counts.pending],
            ["submitted", counts.submitted],
            ["late", counts.late],
            ["overdue", counts.overdue],
          ] as const
        ).map(([key, count]) => (
          <PCard key={key} className="p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              {t(`assignments.list.status.${key}`, key)}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">{count}</p>
          </PCard>
        ))}
      </div>

      <PCard className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                "assignments.list.searchPlaceholder",
                "Search assignments..."
              )}
              className="ps-9"
            />
          </div>

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={t("assignments.list.allCourses", "All courses")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("assignments.list.allCourses", "All courses")}
              </SelectItem>
              {courseOptions.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PCard>

      {assignments.isLoading || courses.isLoading ? (
        <div className="space-y-3">
          <Shimmer className="h-20 rounded-3xl" />
          <Shimmer className="h-20 rounded-3xl" />
          <Shimmer className="h-20 rounded-3xl" />
        </div>
      ) : filtered.length === 0 ? (
        <NoAssignments />
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const config = statusConfig[status];
            const course = courseById.get(assignment.course_id);
            const dueDate = new Date(assignment.due_date);

            return (
              <Link
                key={assignment.id}
                to={`/student/assignments/${assignment.id}`}
                className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PCard className="p-4 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full px-2.5 py-1 text-[11px]"
                        >
                          {course?.name ??
                            course?.code ??
                            t("assignments.list.courseFallback", "Course")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px]",
                            config.className
                          )}
                        >
                          {t(`assignments.list.status.${status}`, config.label)}
                        </Badge>
                      </div>

                      <h2 className="mt-2 text-base font-bold text-foreground">
                        {assignment.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {assignment.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {format(dueDate, "PPP p")}
                        </span>
                        <span>
                          {t("assignments.list.marks", {
                            defaultValue: "{{count}} marks",
                            count: assignment.total_marks,
                          })}
                        </span>
                        <span>
                          {t("assignments.list.dueIn", {
                            defaultValue: "{{time}}",
                            time: formatDistanceToNow(dueDate, {
                              addSuffix: true,
                            }),
                          })}
                        </span>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500"
                    >
                      <ArrowRight className="size-5 rtl:rotate-180" />
                    </span>
                  </div>
                </PCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentListScreen;
