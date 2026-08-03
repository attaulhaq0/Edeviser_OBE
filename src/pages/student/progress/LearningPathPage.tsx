// =============================================================================
// LearningPathPage — routed student learning-path surface
// =============================================================================
// The path renderer already uses the real learning_path_nodes, assignments,
// outcome attainment, and prerequisites. This page supplies the missing course
// selection and route entry point without introducing demo path data.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
    <div className="learning-path-page space-y-4">
      <div className="sr-only" aria-live="polite">
        {selectedCourse?.name} · {t("learningPath.journey")}
      </div>
      <LearningPath
        courseId={courseId}
        studentId={user?.id ?? ""}
        courses={courses.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        onSelectCourseId={setSelectedCourseId}
      />
    </div>
  );
};

export default LearningPathPage;
