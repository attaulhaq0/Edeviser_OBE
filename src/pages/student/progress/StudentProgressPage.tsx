import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, Award, BookOpen, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { NoData } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
    <div
      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

interface CourseProgress {
  course_id: string;
  course_name: string;
  course_code: string;
  attainment_percent: number;
  clo_count: number;
  evidence_count: number;
}

interface ProgressSummary {
  totalCourses: number;
  averageAttainment: number;
  excellentCount: number;
  satisfactoryCount: number;
  developingCount: number;
  notYetCount: number;
  perCourse: CourseProgress[];
}

const useStudentProgress = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.list({ studentId, view: "progress" }),
    queryFn: async (): Promise<ProgressSummary> => {
      if (!studentId) {
        return {
          totalCourses: 0,
          averageAttainment: 0,
          excellentCount: 0,
          satisfactoryCount: 0,
          developingCount: 0,
          notYetCount: 0,
          perCourse: [],
        };
      }

      // Enrolled courses with course details
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_courses")
        .select(`course_id, courses!inner(id, name, code)`)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollErr) throw enrollErr;
      if (!enrollments || enrollments.length === 0) {
        return {
          totalCourses: 0,
          averageAttainment: 0,
          excellentCount: 0,
          satisfactoryCount: 0,
          developingCount: 0,
          notYetCount: 0,
          perCourse: [],
        };
      }

      const courseIds = enrollments.map((e) => e.course_id);

      // Per-course attainment in one query
      const { data: attainment } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent, sample_count")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");

      const courseAttainmentMap = new Map<
        string,
        { sum: number; count: number; samples: number }
      >();
      for (const row of attainment ?? []) {
        if (!row.course_id) continue;
        const cur = courseAttainmentMap.get(row.course_id) ?? {
          sum: 0,
          count: 0,
          samples: 0,
        };
        cur.sum += row.attainment_percent;
        cur.count += 1;
        cur.samples += row.sample_count ?? 0;
        courseAttainmentMap.set(row.course_id, cur);
      }

      // Count CLOs per course
      const { data: clos } = await supabase
        .from("learning_outcomes")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("type", "CLO");

      const cloCountMap = new Map<string, number>();
      for (const row of clos ?? []) {
        if (!row.course_id) continue;
        cloCountMap.set(row.course_id, (cloCountMap.get(row.course_id) ?? 0) + 1);
      }

      const perCourse: CourseProgress[] = enrollments.map((e) => {
        const course = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        const att = courseAttainmentMap.get(course.id);
        const avg = att && att.count > 0 ? Math.round(att.sum / att.count) : 0;
        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          attainment_percent: avg,
          clo_count: cloCountMap.get(course.id) ?? 0,
          evidence_count: att?.samples ?? 0,
        };
      });

      const totalCourses = perCourse.length;
      const averageAttainment =
        totalCourses > 0
          ? Math.round(
              perCourse.reduce((s, c) => s + c.attainment_percent, 0) /
                totalCourses
            )
          : 0;
      const excellentCount = perCourse.filter(
        (c) => c.attainment_percent >= 85
      ).length;
      const satisfactoryCount = perCourse.filter(
        (c) => c.attainment_percent >= 70 && c.attainment_percent < 85
      ).length;
      const developingCount = perCourse.filter(
        (c) => c.attainment_percent >= 50 && c.attainment_percent < 70
      ).length;
      const notYetCount = perCourse.filter(
        (c) => c.attainment_percent < 50
      ).length;

      return {
        totalCourses,
        averageAttainment,
        excellentCount,
        satisfactoryCount,
        developingCount,
        notYetCount,
        perCourse,
      };
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

const attainmentLevel = (percent: number) => {
  if (percent >= 85) return { label: "Excellent", color: "text-green-700 bg-green-50" };
  if (percent >= 70) return { label: "Satisfactory", color: "text-blue-700 bg-blue-50" };
  if (percent >= 50) return { label: "Developing", color: "text-yellow-700 bg-yellow-50" };
  return { label: "Not Yet", color: "text-red-700 bg-red-50" };
};

const KPICard = ({
  icon: Icon,
  label,
  value,
  iconBg,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  iconBg: string;
}) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

const StudentProgressPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data, isLoading } = useStudentProgress(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("progress.title", "My Progress")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "progress.subtitle",
            "Track your attainment across all enrolled courses."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-24 rounded-xl" />
        </div>
      ) : !data || data.totalCourses === 0 ? (
        <NoData />
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={BookOpen}
              label={t("progress.kpi.courses", "Courses")}
              value={data.totalCourses}
              iconBg="bg-blue-50 text-blue-600"
            />
            <KPICard
              icon={TrendingUp}
              label={t("progress.kpi.average", "Average")}
              value={`${data.averageAttainment}%`}
              iconBg="bg-teal-50 text-teal-600"
            />
            <KPICard
              icon={Award}
              label={t("progress.kpi.excellent", "Excellent")}
              value={data.excellentCount}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              icon={Target}
              label={t("progress.kpi.atRisk", "Not Yet")}
              value={data.notYetCount}
              iconBg="bg-red-50 text-red-600"
            />
          </div>

          {/* Per-course list */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("progress.byCourse", "Progress by Course")}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {data.perCourse.map((course) => {
                const level = attainmentLevel(course.attainment_percent);
                return (
                  <Link
                    key={course.course_id}
                    to={`/student/courses/${course.course_id}`}
                    className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {course.course_code}
                          </Badge>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${level.color}`}>
                            {level.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
                          {course.course_name}
                        </p>
                        <div className="mt-2">
                          <ProgressBar value={course.attainment_percent} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {course.clo_count} {t("progress.clos", "CLOs")} · {course.evidence_count} {t("progress.evidence", "evidence")}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-2xl font-black text-gray-900 dark:text-foreground">
                          {course.attainment_percent}%
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 rtl:rotate-180" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentProgressPage;
