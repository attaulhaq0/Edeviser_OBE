import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronRight, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AttainmentInfo from "@/components/shared/AttainmentInfo";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/formatDate";
import { resolveCourseColor } from "@/lib/courseColor";
import { getAttainmentBadgeStyle } from "@/lib/attainmentClassifier";
import type { EnrolledCourseCard } from "@/lib/studentCourseCards";

interface CourseCardProps {
  course: EnrolledCourseCard;
}

/**
 * Single enrolled-course card for the student "My Courses" surface.
 *
 * Renders the course identity (code, name, deterministic color accent), a
 * progress bar, the next assignment + due date (name-only when no due date),
 * a neutral "no upcoming work" indicator when nothing is due, and the
 * attainment value colored by its classification band alongside the shared
 * {@link AttainmentInfo} explanation.
 *
 * The whole card navigates to the course via an accessible stretched-link
 * overlay, leaving the AttainmentInfo popover trigger (a real button) outside
 * the anchor so we never nest interactive controls.
 *
 * Satisfies Requirements 8.1, 8.3, 9.1, 9.2, 9.2a, 9.3, 9.5.
 */
const CourseCard = ({ course }: CourseCardProps) => {
  const { t } = useTranslation("student");

  const accentColor = resolveCourseColor(course.color, course.id);
  const progress = Math.max(
    0,
    Math.min(100, Math.round(course.progress_percent))
  );
  const hasAttainment = course.attainment_percent !== null;

  return (
    <Card className="relative bg-white border-0 shadow-md rounded-xl h-full overflow-hidden transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-500">
      {/* Course color identifier (R9.3) */}
      <div
        className="absolute inset-y-0 start-0 w-1.5"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="p-5 ps-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] font-bold tracking-wider uppercase"
              >
                {course.code}
              </Badge>
            </div>
            {/* Stretched link: the title anchor covers the whole card (R9 navigation) */}
            <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-foreground line-clamp-2">
              <Link
                to={`/student/courses/${course.id}`}
                className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
              >
                {course.name}
              </Link>
            </h2>
          </div>
          <ChevronRight
            className="h-5 w-5 text-gray-400 flex-shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
        </div>

        {course.teacher_name && (
          <p className="text-xs text-gray-500 mb-3">
            {t("courses.taughtBy", "Taught by")} {course.teacher_name}
          </p>
        )}

        {/* Progress bar (R9.1) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
              {t("courses.progress", "Progress")}
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-foreground tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: accentColor }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t(
                "courses.progressLabel",
                "Course progress: {{percent}}%",
                {
                  percent: progress,
                }
              )}
            />
          </div>
        </div>

        {/* Next assignment / no upcoming work (R9.2, R9.2a, R9.5) */}
        <div className="mb-4">
          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
            {t("courses.nextUp", "Next up")}
          </span>
          {course.next_assignment ? (
            <div className="mt-1 flex items-start gap-2">
              <CalendarClock
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground line-clamp-1">
                  {course.next_assignment.title}
                </p>
                {course.next_assignment.due_at ? (
                  <p className="text-xs text-gray-500">
                    {t("courses.due", "Due {{date}}", {
                      date: formatLocalDate(
                        course.next_assignment.due_at,
                        "MMM d, yyyy"
                      ),
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {t("courses.noDueDate", "No due date")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 text-gray-400">
              <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                {t("courses.noUpcomingWork", "No upcoming work")}
              </p>
            </div>
          )}
        </div>

        {/* Attainment with band color + explanation (R8.1, R8.3) */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                {t("courses.attainment", "Attainment")}
              </span>
              {/* Raised above the stretched-link overlay so the popover is reachable */}
              <span className="relative z-10">
                <AttainmentInfo
                  percent={
                    hasAttainment
                      ? course.attainment_percent ?? undefined
                      : undefined
                  }
                  className="h-6 w-6"
                />
              </span>
            </div>
            {hasAttainment ? (
              <span
                className={cn(
                  "mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold",
                  getAttainmentBadgeStyle(course.attainment_percent ?? 0)
                )}
              >
                {course.attainment_percent}%
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm font-semibold text-gray-500">
                —
              </span>
            )}
          </div>
          <div className="text-end">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">
              {t("courses.assignments", "Assignments")}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-foreground tabular-nums">
              {course.assignments_count}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CourseCard;
export type { CourseCardProps };
