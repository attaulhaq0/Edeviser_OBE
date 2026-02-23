import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { BloomsLevel } from '@/types/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeacherKPIData {
  pendingSubmissions: number;
  gradedThisWeek: number;
  avgAttainment: number;
  atRiskCount: number;
  totalStudents: number;
}

export interface CLOAttainmentRow {
  clo_title: string;
  blooms_level: BloomsLevel;
  avg_attainment: number;
}

export interface BloomsDistributionRow {
  level: BloomsLevel;
  count: number;
}

export interface HeatmapCell {
  student_name: string;
  clo_title: string;
  attainment_percent: number;
}

// ─── useTeacherKPIs ─────────────────────────────────────────────────────────

export const useTeacherKPIs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacherDashboard', 'kpis', user?.id],
    queryFn: async (): Promise<TeacherKPIData> => {
      const teacherId = user?.id;
      if (!teacherId) throw new Error('Not authenticated');

      // Get teacher's courses
      const { data: courses } = await db
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const courseIds = (courses as Array<{ id: string }> ?? []).map((c) => c.id);

      if (courseIds.length === 0) {
        return { pendingSubmissions: 0, gradedThisWeek: 0, avgAttainment: 0, atRiskCount: 0, totalStudents: 0 };
      }

      // 1. Pending submissions (no grade record)
      const { data: allSubmissions } = await db
        .from('submissions')
        .select('id, assignment_id, assignments!inner(course_id), grades(id)')
        .in('assignments.course_id', courseIds);

      const submissions = (allSubmissions ?? []) as Array<{ id: string; grades: { id: string } | null }>;
      const pendingSubmissions = submissions.filter((s) => !s.grades).length;

      // 2. Graded this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: gradedThisWeek } = await db
        .from('grades')
        .select('*', { count: 'exact', head: true })
        .eq('graded_by', teacherId)
        .gte('created_at', weekAgo.toISOString());

      // 3. Average attainment across teacher's courses
      const { data: attainmentData } = await db
        .from('outcome_attainment')
        .select('score_percent')
        .eq('scope', 'student_course')
        .in('course_id', courseIds);

      const attainments = (attainmentData ?? []) as Array<{ score_percent: number }>;
      const avgAttainment = attainments.length > 0
        ? Math.round(attainments.reduce((sum, a) => sum + a.score_percent, 0) / attainments.length)
        : 0;

      // 4. Total enrolled students
      const { count: totalStudents } = await db
        .from('student_courses')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds);

      // 5. At-risk count: students not logged in 7+ days OR <50% on 2+ CLOs
      let atRiskCount = 0;
      const { data: enrolledStudents } = await db
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds);

      const studentIds = [...new Set((enrolledStudents as Array<{ student_id: string }> ?? []).map((s) => s.student_id))];

      if (studentIds.length > 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Students inactive 7+ days
        const { data: inactiveProfiles } = await db
          .from('profiles')
          .select('id, last_login_at')
          .in('id', studentIds);

        const inactiveSet = new Set<string>();
        for (const p of (inactiveProfiles ?? []) as Array<{ id: string; last_login_at: string | null }>) {
          if (!p.last_login_at || new Date(p.last_login_at) < sevenDaysAgo) {
            inactiveSet.add(p.id);
          }
        }

        // Students with <50% on 2+ CLOs
        const { data: lowAttainment } = await db
          .from('outcome_attainment')
          .select('student_id, outcome_id')
          .in('course_id', courseIds)
          .eq('scope', 'student_course')
          .lt('score_percent', 50);

        const lowCloMap = new Map<string, number>();
        for (const row of (lowAttainment ?? []) as Array<{ student_id: string; outcome_id: string }>) {
          lowCloMap.set(row.student_id, (lowCloMap.get(row.student_id) ?? 0) + 1);
        }

        const atRiskSet = new Set<string>(inactiveSet);
        for (const [sid, count] of lowCloMap) {
          if (count >= 2) atRiskSet.add(sid);
        }
        atRiskCount = atRiskSet.size;
      }

      return {
        pendingSubmissions,
        gradedThisWeek: gradedThisWeek ?? 0,
        avgAttainment,
        atRiskCount,
        totalStudents: totalStudents ?? 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
};

// ─── useTeacherCLOAttainment ────────────────────────────────────────────────

export const useTeacherCLOAttainment = (courseId?: string) => {
  return useQuery({
    queryKey: ['teacherDashboard', 'cloAttainment', courseId],
    queryFn: async (): Promise<CLOAttainmentRow[]> => {
      if (!courseId) return [];

      // Get CLOs for this course
      const { data: clos } = await db
        .from('learning_outcomes')
        .select('id, title, blooms_level')
        .eq('type', 'CLO')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const typedCLOs = (clos ?? []) as Array<{ id: string; title: string; blooms_level: BloomsLevel }>;
      if (typedCLOs.length === 0) return [];

      const cloIds = typedCLOs.map((c) => c.id);

      // Get attainment for these CLOs
      const { data: attainment } = await db
        .from('outcome_attainment')
        .select('outcome_id, score_percent')
        .in('outcome_id', cloIds)
        .eq('scope', 'student_course');

      const attainmentMap = new Map<string, number[]>();
      for (const row of (attainment ?? []) as Array<{ outcome_id: string; score_percent: number }>) {
        const arr = attainmentMap.get(row.outcome_id) ?? [];
        arr.push(row.score_percent);
        attainmentMap.set(row.outcome_id, arr);
      }

      return typedCLOs.map((clo) => {
        const scores = attainmentMap.get(clo.id) ?? [];
        const avg = scores.length > 0
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : 0;
        return {
          clo_title: clo.title,
          blooms_level: clo.blooms_level,
          avg_attainment: avg,
        };
      });
    },
    enabled: !!courseId,
    staleTime: 30_000,
  });
};

// ─── useTeacherBloomsDistribution ───────────────────────────────────────────

export const useTeacherBloomsDistribution = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacherDashboard', 'bloomsDistribution', user?.id],
    queryFn: async (): Promise<BloomsDistributionRow[]> => {
      const teacherId = user?.id;
      if (!teacherId) return [];

      const { data: courses } = await db
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const courseIds = (courses as Array<{ id: string }> ?? []).map((c) => c.id);
      if (courseIds.length === 0) return [];

      const { data: clos } = await db
        .from('learning_outcomes')
        .select('blooms_level')
        .eq('type', 'CLO')
        .eq('is_active', true)
        .in('course_id', courseIds);

      const countMap = new Map<string, number>();
      for (const row of (clos ?? []) as Array<{ blooms_level: BloomsLevel | null }>) {
        if (row.blooms_level) {
          countMap.set(row.blooms_level, (countMap.get(row.blooms_level) ?? 0) + 1);
        }
      }

      const levels: BloomsLevel[] = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];
      return levels
        .map((level) => ({ level, count: countMap.get(level) ?? 0 }))
        .filter((r) => r.count > 0);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
};

// ─── useStudentPerformanceHeatmap ───────────────────────────────────────────

export const useStudentPerformanceHeatmap = (courseId?: string) => {
  return useQuery({
    queryKey: ['teacherDashboard', 'heatmap', courseId],
    queryFn: async (): Promise<HeatmapCell[]> => {
      if (!courseId) return [];

      // Get CLOs for this course
      const { data: clos } = await db
        .from('learning_outcomes')
        .select('id, title')
        .eq('type', 'CLO')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const typedCLOs = (clos ?? []) as Array<{ id: string; title: string }>;
      if (typedCLOs.length === 0) return [];

      const cloIds = typedCLOs.map((c) => c.id);
      const cloTitleMap = new Map(typedCLOs.map((c) => [c.id, c.title]));

      // Get enrolled students
      const { data: enrollments } = await db
        .from('student_courses')
        .select('student_id, profiles!student_courses_student_id_fkey(full_name)')
        .eq('course_id', courseId);

      const students = (enrollments ?? []) as Array<{
        student_id: string;
        profiles: { full_name: string } | null;
      }>;

      if (students.length === 0) return [];

      const studentIds = students.map((s) => s.student_id);
      const studentNameMap = new Map(
        students.map((s) => [s.student_id, s.profiles?.full_name ?? 'Unknown']),
      );

      // Get attainment data
      const { data: attainment } = await db
        .from('outcome_attainment')
        .select('student_id, outcome_id, score_percent')
        .in('outcome_id', cloIds)
        .in('student_id', studentIds)
        .eq('scope', 'student_course');

      const cells: HeatmapCell[] = [];
      const attainmentLookup = new Map<string, number>();
      for (const row of (attainment ?? []) as Array<{ student_id: string; outcome_id: string; score_percent: number }>) {
        attainmentLookup.set(`${row.student_id}:${row.outcome_id}`, row.score_percent);
      }

      for (const sid of studentIds) {
        for (const cloId of cloIds) {
          cells.push({
            student_name: studentNameMap.get(sid) ?? 'Unknown',
            clo_title: cloTitleMap.get(cloId) ?? '',
            attainment_percent: attainmentLookup.get(`${sid}:${cloId}`) ?? -1,
          });
        }
      }

      return cells;
    },
    enabled: !!courseId,
    staleTime: 30_000,
  });
};
