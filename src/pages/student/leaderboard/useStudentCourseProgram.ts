// =============================================================================
// useStudentCourseProgram — fetch enrolled courses & programs for leaderboard filters
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface CourseOption {
  id: string;
  name: string;
}

interface ProgramOption {
  id: string;
  name: string;
}

interface StudentCourseProgramData {
  courses: CourseOption[];
  programs: ProgramOption[];
}

export const useStudentCourseProgram = (studentId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ["student", "courseProgram", studentId],
    queryFn: async (): Promise<StudentCourseProgramData> => {
      if (!studentId) return { courses: [], programs: [] };

      // Fetch enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", studentId)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      const courseIds = (enrollments ?? []).map((e) => e.course_id);

      if (courseIds.length === 0) return { courses: [], programs: [] };

      // Fetch course details with program info
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, name, program_id")
        .in("id", courseIds);

      if (courseError) throw courseError;

      const typedCourses = courseData ?? [];

      const courses: CourseOption[] = typedCourses.map((c) => ({
        id: c.id,
        name: c.name,
      }));

      // Deduplicate program IDs
      const programIds = [
        ...new Set(typedCourses.map((c) => c.program_id).filter(Boolean)),
      ];

      if (programIds.length === 0) return { courses, programs: [] };

      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from("programs")
        .select("id, name")
        .in("id", programIds);

      if (programError) throw programError;

      const programs: ProgramOption[] = (programData ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      }));

      return { courses, programs };
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });

  return {
    courses: data?.courses ?? [],
    programs: data?.programs ?? [],
    isLoading,
  };
};
