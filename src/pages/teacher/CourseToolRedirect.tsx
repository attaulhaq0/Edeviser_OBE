import { useMemo } from "react";
import { Navigate } from "react-router-dom";

import { NoData } from "@/components/shared/EmptyState";
import { Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherCourses } from "@/hooks/useCourses";

interface CourseToolRedirectProps {
  userRole: "teacher" | "coordinator";
  tool: "question-bank" | "discussions";
}

/**
 * Prototype sidebars expose course tools as global destinations. Production
 * stores those tools per course, so this adapter opens the first real,
 * role-visible course instead of inventing demo content or a broken route.
 */
const CourseToolRedirect = ({ userRole, tool }: CourseToolRedirectProps) => {
  const { user } = useAuth();
  const { data: result, isLoading } = useTeacherCourses();
  const courses = useMemo(() => {
    const visible = result?.data ?? [];
    return userRole === "teacher"
      ? visible.filter((course) => course.teacher_id === user?.id)
      : visible;
  }, [result?.data, user?.id, userRole]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-10 w-64 rounded-xl" />
        <Shimmer className="h-72 rounded-[20px]" />
      </div>
    );
  }

  const course = courses[0];
  if (!course) return <NoData />;

  return <Navigate replace to={`/${userRole}/courses/${course.id}/${tool}`} />;
};

export default CourseToolRedirect;
