// =============================================================================
// LearningPathPage — routed student learning-path surface
// =============================================================================
// The path renderer already uses the real learning_path_nodes, assignments,
// outcome attainment, and prerequisites. This page supplies the missing course
// selection and route entry point without introducing demo path data.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Map } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoData } from "@/components/shared/EmptyState";
import { Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import LearningPath from "@/pages/student/progress/LearningPath";

const LearningPathPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data: courses, isLoading } = useStudentCourses(user?.id);
  const initialCourseId = courses?.[0]?.id ?? "";
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const courseId = selectedCourseId || initialCourseId;
  const selectedCourse = useMemo(
    () => (courses ?? []).find((course) => course.id === courseId),
    [courses, courseId]
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Shimmer className="h-12 w-64 rounded-xl" />
        <Shimmer className="h-72 rounded-[20px]" />
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return <NoData />;
  }

  return (
    <div className="space-y-4">
      {/* Integrated compact header bar combining Title, Subtitle, and Course Selector */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80">
            <Map className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
              {t("learningPath.title")}
            </h1>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {t("learningPath.subtitle")}
            </p>
          </div>
        </div>

        <Select value={courseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger
            className="h-9 w-full sm:w-64 border-slate-200 bg-white font-extrabold text-slate-800 shadow-2xs text-xs"
            aria-label={t("learningPath.coursePicker")}
          >
            <SelectValue placeholder={t("learningPath.coursePicker")} />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem
                key={course.id}
                value={course.id}
                className="text-xs font-bold"
              >
                {course.code} — {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sr-only" aria-live="polite">
        {selectedCourse?.name} · {t("learningPath.journey")}
      </div>
      <LearningPath courseId={courseId} studentId={user?.id ?? ""} />
    </div>
  );
};

export default LearningPathPage;
