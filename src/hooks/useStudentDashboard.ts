import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface StudentKPIData {
  enrolledCourses: number;
  completedAssignments: number;
  avgAttainment: number;
  currentStreak: number;
  currentLevel: number;
  totalXP: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
}

export const useStudentKPIs = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studentGamification.detail(studentId ?? ''),
    queryFn: async (): Promise<StudentKPIData> => {
      if (!studentId) {
        return {
          enrolledCourses: 0,
          completedAssignments: 0,
          avgAttainment: 0,
          currentStreak: 0,
          currentLevel: 1,
          totalXP: 0,
        };
      }

      const { count: enrolledCourses } = await supabase
        .from('student_courses')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      const { count: completedAssignments } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'graded');

      const { data: attainmentData } = await supabase
        .from('outcome_attainment')
        .select('attainment_percent')
        .eq('student_id', studentId)
        .eq('scope', 'student_course');

      const typedAttainment = attainmentData ?? [];
      const avgAttainment =
        typedAttainment.length > 0
          ? Math.round(
              typedAttainment.reduce((sum, a) => sum + a.attainment_percent, 0) /
                typedAttainment.length,
            )
          : 0;

      const { data: gamification } = await supabase
        .from('student_gamification')
        .select('streak_current, level, xp_total')
        .eq('student_id', studentId)
        .maybeSingle();

      return {
        enrolledCourses: enrolledCourses ?? 0,
        completedAssignments: completedAssignments ?? 0,
        avgAttainment,
        currentStreak: gamification?.streak_current ?? 0,
        currentLevel: gamification?.level ?? 1,
        totalXP: gamification?.xp_total ?? 0,
      };
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

export const useUpcomingDeadlines = (studentId: string | undefined, limit: number = 5) => {
  return useQuery({
    queryKey: queryKeys.assignments.list({ studentId, upcoming: true, limit }),
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      if (!studentId) return [];

      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId);

      const courseIds = (enrollments ?? []).map(
        (e) => e.course_id,
      );

      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, course_id, due_date, courses(name)')
        .in('course_id', courseIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        course_name: (a.courses as { name: string } | null)?.name ?? a.course_id,
        due_date: a.due_date,
      }));
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};
