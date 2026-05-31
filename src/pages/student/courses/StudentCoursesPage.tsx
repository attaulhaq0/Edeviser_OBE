import { useTranslation } from "react-i18next";

import Shimmer from "@/components/shared/Shimmer";
import { NoCourses } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import CourseCard from "./CourseCard";

const StudentCoursesPage = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const { data: courses, isLoading } = useStudentCourses(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("courses.title", "My Courses")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "courses.subtitle",
            "View your enrolled courses, progress, and assignments."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Shimmer className="h-56 rounded-xl" />
          <Shimmer className="h-56 rounded-xl" />
          <Shimmer className="h-56 rounded-xl" />
        </div>
      ) : !courses || courses.length === 0 ? (
        <NoCourses />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
