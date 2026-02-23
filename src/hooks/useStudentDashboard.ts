import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

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
    queryKey: ['student', 'kpis', studentId],
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

      const { count: enrolledCourses } = await db
        .from('student_courses')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      const { count: completedAssignments } = await db
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'graded');

      const { data: attainmentData } = await db
        .from('outcome_attainment')
        .select('score_percent')
        .eq('student_id', studentId)
        .eq('scope', 'CLO');

      const typedAttainment = (attainmentData as Array<{ score_percent: number }>) ?? [];
      const avgAttainment =
        typedAttainment.length > 0
          ? Math.round(
              typedAttainment.reduce((sum, a) => sum + a.score_percent, 0) /
                typedAttainment.length,
            )
          : 0;

      const { data: gamification } = await db
        .from('student_gamification')
        .select('current_streak, current_level, xp_total')
        .eq('student_id', studentId)
        .maybeSingle();

      const gam = gamification as {
        current_streak: number;
        current_level: number;
        xp_total: number;
      } | null;

      return {
        enrolledCourses: enrolledCourses ?? 0,
        completedAssignments: completedAssignments ?? 0,
        avgAttainment,
        currentStreak: gam?.current_streak ?? 0,
        currentLevel: gam?.current_level ?? 1,
        totalXP: gam?.xp_total ?? 0,
      };
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

export const useUpcomingDeadlines = (studentId: string | undefined, limit: number = 5) => {
  return useQuery({
    queryKey: ['student', 'upcomingDeadlines', studentId, limit],
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      if (!studentId) return [];

      const { data: enrollments } = await db
        .from('student_courses')
        .select('course_id')
        .eq('student_id', studentId);

      const courseIds = ((enrollments ?? []) as Array<{ course_id: string }>).map(
        (e) => e.course_id,
      );

      if (courseIds.length === 0) return [];

      const { data, error } = await db
        .from('assignments')
        .select('id, title, course_id, due_date')
        .in('course_id', courseIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return ((data ?? []) as Array<{
        id: string;
        title: string;
        course_id: string;
        due_date: string;
      }>).map((a) => ({
        id: a.id,
        title: a.title,
        course_name: `Course ${a.course_id.slice(0, 8)}`,
        due_date: a.due_date,
      }));
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};
