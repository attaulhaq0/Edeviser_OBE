import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export interface CoordinatorKPIData {
  totalPLOs: number;
  totalCourses: number;
  cloCoveragePercent: number;
  atRiskStudents: number;
  teacherCompliancePercent: number;
}

export const useCoordinatorKPIs = () => {
  return useQuery({
    queryKey: ['coordinator', 'kpis'],
    queryFn: async (): Promise<CoordinatorKPIData> => {
      // 1. Total PLOs
      const { count: totalPLOs } = await db
        .from('learning_outcomes')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'PLO');

      // 2. Total Courses
      const { count: totalCourses } = await db
        .from('courses')
        .select('*', { count: 'exact', head: true });

      // 3. CLO Coverage: % of PLOs that have at least one CLO mapped via outcome_mappings
      let cloCoveragePercent = 0;
      const ploCount = totalPLOs ?? 0;

      if (ploCount > 0) {
        const { data: ploIds } = await db
          .from('learning_outcomes')
          .select('id')
          .eq('type', 'PLO');

        const typedPloIds = (ploIds as Array<{ id: string }>) ?? [];

        if (typedPloIds.length > 0) {
          const { data: mappings } = await db
            .from('outcome_mappings')
            .select('parent_outcome_id')
            .in(
              'parent_outcome_id',
              typedPloIds.map((p) => p.id),
            );

          const typedMappings = (mappings as Array<{ parent_outcome_id: string }>) ?? [];
          const coveredPLOs = new Set(typedMappings.map((m) => m.parent_outcome_id));
          cloCoveragePercent = Math.round((coveredPLOs.size / ploCount) * 100);
        }
      }

      // 4. At-Risk Students: active students (placeholder until attainment data exists)
      const { count: atRiskStudents } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true);

      // 5. Teacher Compliance Rate: % of courses with at least one CLO defined
      let teacherCompliancePercent = 0;
      const courseCount = totalCourses ?? 0;

      if (courseCount > 0) {
        const { data: coursesWithCLOs } = await db
          .from('learning_outcomes')
          .select('course_id')
          .eq('type', 'CLO');

        const typedCourseCLOs = (coursesWithCLOs as Array<{ course_id: string }>) ?? [];
        const uniqueCourses = new Set(
          typedCourseCLOs.map((c) => c.course_id).filter(Boolean),
        );
        teacherCompliancePercent = Math.round((uniqueCourses.size / courseCount) * 100);
      }

      return {
        totalPLOs: ploCount,
        totalCourses: courseCount,
        cloCoveragePercent,
        atRiskStudents: atRiskStudents ?? 0,
        teacherCompliancePercent,
      };
    },
    staleTime: 30_000,
  });
};
