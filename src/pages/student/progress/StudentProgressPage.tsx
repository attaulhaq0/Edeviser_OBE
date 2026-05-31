import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Target,
  Award,
  BookOpen,
  ChevronRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { NoData } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProgress } from "@/hooks/useStudentProgress";

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
    <div
      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

const attainmentLevel = (percent: number) => {
  if (percent >= 85)
    return { label: "Excellent", color: "text-green-700 bg-green-50" };
  if (percent >= 70)
    return { label: "Satisfactory", color: "text-blue-700 bg-blue-50" };
  if (percent >= 50)
    return { label: "Developing", color: "text-yellow-700 bg-yellow-50" };
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
      <div
        className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}
      >
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
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold"
                          >
                            {course.course_code}
                          </Badge>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${level.color}`}
                          >
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
                          {course.clo_count} {t("progress.clos", "CLOs")} ·{" "}
                          {course.evidence_count}{" "}
                          {t("progress.evidence", "evidence")}
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
