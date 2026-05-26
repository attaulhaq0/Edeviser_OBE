import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
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
}

const useChildProgress = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.outcomeAttainment.list({
      studentId,
      view: "parent-progress",
    }),
    queryFn: async (): Promise<CourseProgress[]> => {
      if (!studentId) return [];

      const { data: enrollments } = await supabase
        .from("student_courses")
        .select(`course_id, courses!inner(id, name, code)`)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      const { data: attainment } = await supabase
        .from("outcome_attainment")
        .select("course_id, attainment_percent")
        .eq("student_id", studentId)
        .in("course_id", courseIds)
        .eq("scope", "student_course");

      const map = new Map<string, { sum: number; count: number }>();
      for (const row of attainment ?? []) {
        if (!row.course_id) continue;
        const cur = map.get(row.course_id) ?? { sum: 0, count: 0 };
        cur.sum += row.attainment_percent;
        cur.count += 1;
        map.set(row.course_id, cur);
      }

      return enrollments.map((e) => {
        const course = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        const att = map.get(course.id);
        return {
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          attainment_percent:
            att && att.count > 0 ? Math.round(att.sum / att.count) : 0,
        };
      });
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
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

  const { data: courses, isLoading: progressLoading } = useChildProgress(
    effectiveChildId || undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("parent.progress.title", "Child Progress")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "parent.progress.subtitle",
            "Detailed attainment by course for each linked child."
          )}
        </p>
      </div>

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
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
              <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {t(
                  "parent.progress.noData",
                  "No progress data yet. Once your child has graded assignments, attainment will appear here."
                )}
              </p>
            </Card>
          ) : (
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
                  {t("parent.progress.byCourse", "Progress by Course")}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {courses.map((course) => (
                  <div key={course.course_id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold tracking-wider uppercase text-gray-500">
                          {course.course_code}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                          {course.course_name}
                        </p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-foreground">
                        {course.attainment_percent}%
                      </p>
                    </div>
                    <ProgressBar value={course.attainment_percent} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ParentProgressPage;
