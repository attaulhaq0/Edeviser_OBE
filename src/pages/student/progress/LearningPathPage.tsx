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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Map className="size-5 text-teal-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">
              {t("learningPath.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t("learningPath.subtitle")}
          </p>
        </div>
        <Select value={courseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger
            className="w-full sm:w-64"
            aria-label={t("learningPath.coursePicker")}
          >
            <SelectValue placeholder={t("learningPath.coursePicker")} />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
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
