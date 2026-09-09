import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  moduleId?: string;
  outcomeIds: string[];
  sequenceOrder: number;
  estimatedMinutes?: number;
  status: "draft" | "published" | "archived";
  activityCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonActivity {
  id: string;
  title: string;
  type: string;
  outcomeIds: string[];
  estimatedMinutes?: number;
  sequenceOrder: number;
}

export interface LearningPathLesson {
  lessonId: string;
  lessonTitle: string;
  moduleId?: string;
  sequenceOrder: number;
  outcomeIds: string[];
  estimatedMinutes?: number;
  activities: LessonActivity[];
}

export const useCourseLessons = (courseId: string | undefined) =>
  useQuery({
    queryKey: ["lessons", "course", courseId] as const,
    enabled: !!courseId,
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase.rpc(
        "get_course_lessons" as never,
        { p_course_id: courseId } as never
      );
      if (error) throw error;
      return ((data ?? []) as unknown) as Lesson[];
    },
  });

export const useStudentLearningPath = (courseId: string | undefined) =>
  useQuery({
    queryKey: ["learning-path", courseId] as const,
    enabled: !!courseId,
    queryFn: async (): Promise<LearningPathLesson[]> => {
      const { data, error } = await supabase.rpc(
        "get_student_learning_path" as never,
        { p_course_id: courseId } as never
      );
      if (error) throw error;
      return ((data ?? []) as unknown) as LearningPathLesson[];
    },
  });

const useLessons = { useCourseLessons, useStudentLearningPath };
export default useLessons;
