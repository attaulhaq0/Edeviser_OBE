import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Award, BookOpen, Target, TrendingUp } from "lucide-react";

import {
  Badge,
  KPICard,
  MasteryRing,
  PCard,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/design-system";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { useParentChildProgress } from "@/hooks/useParentProgress";
import { attainmentValueClass } from "@/lib/attainmentTone";

const bandChipClass = (p: number): string => {
  if (p >= 85) return "text-green-600 bg-green-50";
  if (p >= 70) return "text-sky-700 bg-sky-50";
  if (p >= 50) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const ParentProgressPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(
    user?.id
  );
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const effectiveChildId = useMemo(() => {
    if (selectedChildId) return selectedChildId;
    return children && children.length > 0 ? children[0]?.student_id ?? "" : "";
  }, [selectedChildId, children]);

  const { data: courses, isLoading: progressLoading } = useParentChildProgress(
    effectiveChildId || undefined
  );

  const summary = useMemo(() => {
    const list = courses ?? [];
    const avg =
      list.length > 0
        ? Math.round(
            list.reduce((s, c) => s + c.attainment_percent, 0) / list.length
          )
        : 0;
    return {
      total: list.length,
      avg,
      excellent: list.filter((c) => c.attainment_percent >= 85).length,
      notYet: list.filter((c) => c.attainment_percent < 50).length,
    };
  }, [courses]);

  const bandLabel = (p: number): string => {
    if (p >= 85) return t("parent.progress.level.excellent", "Excellent");
    if (p >= 70) return t("parent.progress.level.satisfactory", "Satisfactory");
    if (p >= 50) return t("parent.progress.level.developing", "Developing");
    return t("parent.progress.level.notYet", "Not Yet");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={TrendingUp}
        title={t("parent.progress.title", "Child Progress")}
        description={t(
          "parent.progress.subtitle",
          "Detailed attainment by course for each linked child."
        )}
      />

      {childrenLoading ? (
        <Shimmer className="h-64 rounded-xl" />
      ) : !children || children.length === 0 ? (
        <NoLinkedStudents />
      ) : (
        <>
          {children.length > 1 ? (
            <div className="max-w-xs">
              <Select
                value={effectiveChildId}
                onValueChange={setSelectedChildId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "parent.progress.selectChild",
                      "Select a child"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.student_id} value={c.student_id}>
                      {c.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {progressLoading ? (
            <Shimmer className="h-64 rounded-xl" />
          ) : !courses || courses.length === 0 ? (
            <PCard className="p-8 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                {t(
                  "parent.progress.noData",
                  "No progress data yet. Once your child has graded assignments, attainment will appear here."
                )}
              </p>
            </PCard>
          ) : (
            <>
              {/* Overall mastery */}
              <PCard>
                <div className="flex items-center gap-5 p-6">
                  <MasteryRing value={summary.avg} size={104} tone="auto" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {t("parent.progress.average", "Average Attainment")}
                    </p>
                    <p
                      className={`text-3xl font-black ${attainmentValueClass(
                        summary.avg
                      )}`}
                    >
                      {summary.avg}%
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {summary.total} {t("parent.progress.courses", "courses")}
                    </p>
                  </div>
                </div>
              </PCard>

              {/* KPI row */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KPICard
                  icon={BookOpen}
                  label={t("parent.progress.courses", "Courses")}
                  value={summary.total}
                />
                <KPICard
                  icon={TrendingUp}
                  label={t("parent.progress.average", "Average")}
                  value={`${summary.avg}%`}
                  valueClassName={attainmentValueClass(summary.avg)}
                />
                <KPICard
                  icon={Award}
                  label={t("parent.progress.level.excellent", "Excellent")}
                  value={summary.excellent}
                  iconBgClass="bg-green-50"
                  iconColorClass="text-green-600"
                />
                <KPICard
                  icon={Target}
                  label={t("parent.progress.level.notYet", "Not Yet")}
                  value={summary.notYet}
                  valueClassName={
                    summary.notYet > 0 ? "text-red-600" : "text-sky-700"
                  }
                  iconBgClass="bg-red-50"
                  iconColorClass="text-red-600"
                />
              </div>

              {/* Per-course */}
              <PCard>
                <div className="p-6">
                  <SectionHeader
                    icon={TrendingUp}
                    title={t("parent.progress.byCourse", "Progress by Course")}
                  />
                  <div className="mt-4 space-y-2">
                    {courses.map((course) => (
                      <div
                        key={course.course_id}
                        className="flex items-center gap-4 rounded-xl border border-slate-100 p-3"
                      >
                        <MasteryRing
                          value={course.attainment_percent}
                          size={52}
                          strokeWidth={6}
                          tone="auto"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold"
                            >
                              {course.course_code}
                            </Badge>
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${bandChipClass(
                                course.attainment_percent
                              )}`}
                            >
                              {bandLabel(course.attainment_percent)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-foreground">
                            {course.course_name}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-2xl font-black ${attainmentValueClass(
                            course.attainment_percent
                          )}`}
                        >
                          {course.attainment_percent}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PCard>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ParentProgressPage;
