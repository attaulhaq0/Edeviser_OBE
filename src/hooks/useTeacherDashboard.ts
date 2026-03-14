import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { BloomsLevel } from '@/types/app';

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
    queryKey: queryKeys.teacherDashboard.list({ type: 'kpis', teacherId: user?.id }),
    queryFn: async (): Promise<TeacherKPIData> => {
      const teacherId = user?.id;
      if (!teacherId) throw new Error('Not authenticated');

      // Get teacher's courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const courseIds = (courses ?? []).map((c) => c.id);

      if (courseIds.length === 0) {
        return { pendingSubmissions: 0, gradedThisWeek: 0, avgAttainment: 0, atRiskCount: 0, totalStudents: 0 };
      }

      // 1. Pending submissions (no grade record)
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('id, assignment_id, assignments!inner(course_id), grades(id)')
        .in('assignments.course_id', courseIds);

      const submissions = allSubmissions ?? [];
      const pendingSubmissions = submissions.filter((s) => !s.grades || s.grades.length === 0).length;

      // 2. Graded this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: gradedThisWeek } = await supabase
        .from('grades')
        .select('*', { count: 'exact', head: true })
        .eq('graded_by', teacherId)
        .gte('created_at', weekAgo.toISOString());

      // 3. Average attainment across teacher's courses
      const { data: attainmentData } = await supabase
        .from('outcome_attainment')
        .select('attainment_percent')
        .eq('scope', 'student_course')
        .in('course_id', courseIds);

      const attainments = attainmentData ?? [];
      const avgAttainment = attainments.length > 0
        ? Math.round(attainments.reduce((sum, a) => sum + a.attainment_percent, 0) / attainments.length)
        : 0;

      // 4. Total enrolled students
      const { count: totalStudents } = await supabase
        .from('student_courses')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds);

      // 5. At-risk count: students not logged in 7+ days OR <50% on 2+ CLOs
      let atRiskCount = 0;
      const { data: enrolledStudents } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds);

      const studentIds = [...new Set((enrolledStudents ?? []).map((s) => s.student_id))];

      if (studentIds.length > 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Students inactive 7+ days
        const { data: inactiveProfiles } = await supabase
          .from('profiles')
          .select('id, last_seen_at')
          .in('id', studentIds);

        const inactiveSet = new Set<string>();
        for (const p of inactiveProfiles ?? []) {
          if (!p.last_seen_at || new Date(p.last_seen_at) < sevenDaysAgo) {
            inactiveSet.add(p.id);
          }
        }

        // Students with <50% on 2+ CLOs
        const { data: lowAttainment } = await supabase
          .from('outcome_attainment')
          .select('student_id, outcome_id')
          .in('course_id', courseIds)
          .eq('scope', 'student_course')
          .lt('attainment_percent', 50);

        const lowCloMap = new Map<string, number>();
        for (const row of lowAttainment ?? []) {
          lowCloMap.set(row.student_id!, (lowCloMap.get(row.student_id!) ?? 0) + 1);
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
    queryKey: queryKeys.teacherDashboard.list({ type: 'cloAttainment', courseId }),
    queryFn: async (): Promise<CLOAttainmentRow[]> => {
      if (!courseId) return [];

      // Get CLOs for this course
      const { data: clos } = await supabase
        .from('learning_outcomes')
        .select('id, title, blooms_level')
        .eq('type', 'CLO')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      const typedCLOs = clos ?? [];
      if (typedCLOs.length === 0) return [];

      const cloIds = typedCLOs.map((c) => c.id);

      // Get attainment for these CLOs
      const { data: attainment } = await supabase
        .from('outcome_attainment')
        .select('outcome_id, attainment_percent')
        .in('outcome_id', cloIds)
        .eq('scope', 'student_course');

      const attainmentMap = new Map<string, number[]>();
      for (const row of attainment ?? []) {
        const arr = attainmentMap.get(row.outcome_id) ?? [];
        arr.push(row.attainment_percent);
        attainmentMap.set(row.outcome_id, arr);
      }

      return typedCLOs.map((clo) => {
        const scores = attainmentMap.get(clo.id) ?? [];
        const avg = scores.length > 0
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : 0;
        return {
          clo_title: clo.title,
          blooms_level: clo.blooms_level as BloomsLevel,
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
    queryKey: queryKeys.teacherDashboard.list({ type: 'bloomsDistribution', teacherId: user?.id }),
    queryFn: async (): Promise<BloomsDistributionRow[]> => {
      const teacherId = user?.id;
      if (!teacherId) return [];

      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) return [];

      const { data: clos } = await supabase
        .from('learning_outcomes')
        .select('blooms_level')
        .eq('type', 'CLO')
        .in('course_id', courseIds);

      const countMap = new Map<string, number>();
      for (const row of clos ?? []) {
        if (row.blooms_level) {
          countMap.set(row.blooms_level, (countMap.get(row.blooms_level) ?? 0) + 1);
        }
      }

      const levels: BloomsLevel[] = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];
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
    queryKey: queryKeys.teacherDashboard.list({ type: 'heatmap', courseId }),
    queryFn: async (): Promise<HeatmapCell[]> => {
      if (!courseId) return [];

      // Get CLOs for this course
      const { data: clos } = await supabase
        .from('learning_outcomes')
        .select('id, title')
        .eq('type', 'CLO')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      const typedCLOs = clos ?? [];
      if (typedCLOs.length === 0) return [];

      const cloIds = typedCLOs.map((c) => c.id);
      const cloTitleMap = new Map(typedCLOs.map((c) => [c.id, c.title]));

      // Get enrolled students
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('student_id, profiles!student_courses_student_id_fkey(full_name)')
        .eq('course_id', courseId);

      const students = enrollments ?? [];

      if (students.length === 0) return [];

      const studentIds = students.map((s) => s.student_id);
      const studentNameMap = new Map(
        students.map((s) => {
          const profile = s.profiles as { full_name: string } | null;
          return [s.student_id, profile?.full_name ?? 'Unknown'];
        }),
      );

      // Get attainment data
      const { data: attainment } = await supabase
        .from('outcome_attainment')
        .select('student_id, outcome_id, attainment_percent')
        .in('outcome_id', cloIds)
        .in('student_id', studentIds)
        .eq('scope', 'student_course');

      const cells: HeatmapCell[] = [];
      const attainmentLookup = new Map<string, number>();
      for (const row of attainment ?? []) {
        attainmentLookup.set(`${row.student_id}:${row.outcome_id}`, row.attainment_percent);
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


// ─── At-Risk Student Types ──────────────────────────────────────────────────

export interface AtRiskStudent {
  id: string;
  full_name: string;
  email: string;
  last_login_at: string | null;
  risk_reasons: string[];
  low_clo_count: number;
  days_inactive: number;
}

// ─── useAtRiskStudents ──────────────────────────────────────────────────────

export const useAtRiskStudents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teacherDashboard.list({ type: 'atRiskStudents', teacherId: user?.id }),
    queryFn: async (): Promise<AtRiskStudent[]> => {
      const teacherId = user?.id;
      if (!teacherId) throw new Error('Not authenticated');

      // Get teacher's active courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) return [];

      // Get enrolled student IDs
      const { data: enrolledStudents } = await supabase
        .from('student_courses')
        .select('student_id')
        .in('course_id', courseIds);

      const studentIds = [
        ...new Set(
          (enrolledStudents ?? []).map((s) => s.student_id),
        ),
      ];
      if (studentIds.length === 0) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get profiles for all enrolled students
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, last_seen_at')
        .in('id', studentIds);

      const typedProfiles = profiles ?? [];

      // Build inactive set with days count
      const inactiveMap = new Map<string, number>();
      for (const p of typedProfiles) {
        if (!p.last_seen_at || new Date(p.last_seen_at) < sevenDaysAgo) {
          const lastLogin = p.last_seen_at ? new Date(p.last_seen_at) : null;
          const daysInactive = lastLogin
            ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          inactiveMap.set(p.id, daysInactive);
        }
      }

      // Students with <50% on 2+ CLOs
      const { data: lowAttainment } = await supabase
        .from('outcome_attainment')
        .select('student_id, outcome_id')
        .in('course_id', courseIds)
        .eq('scope', 'student_course')
        .lt('attainment_percent', 50);

      const lowCloMap = new Map<string, number>();
      for (const row of lowAttainment ?? []) {
        lowCloMap.set(row.student_id!, (lowCloMap.get(row.student_id!) ?? 0) + 1);
      }

      // Combine into at-risk list
      const atRiskSet = new Set<string>();
      for (const sid of inactiveMap.keys()) atRiskSet.add(sid);
      for (const [sid, count] of lowCloMap) {
        if (count >= 2) atRiskSet.add(sid);
      }

      const profileMap = new Map(typedProfiles.map((p) => [p.id, p]));

      const result: AtRiskStudent[] = [];
      for (const sid of atRiskSet) {
        const profile = profileMap.get(sid);
        if (!profile) continue;

        const reasons: string[] = [];
        const daysInactive = inactiveMap.get(sid) ?? 0;
        if (inactiveMap.has(sid)) {
          reasons.push('Inactive 7+ days');
        }
        const lowCount = lowCloMap.get(sid) ?? 0;
        if (lowCount >= 2) {
          reasons.push(`Below 50% on ${lowCount} CLOs`);
        }

        result.push({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          last_login_at: profile.last_seen_at,
          risk_reasons: reasons,
          low_clo_count: lowCount,
          days_inactive: daysInactive,
        });
      }

      // Sort by most risk reasons first, then by days inactive
      result.sort((a, b) => b.risk_reasons.length - a.risk_reasons.length || b.days_inactive - a.days_inactive);

      return result;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
};

// ─── useSendNudge ───────────────────────────────────────────────────────────

export const useSendNudge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, message }: { studentId: string; message: string }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          type: 'nudge',
          title: 'Your teacher sent you a nudge',
          body: message,
          is_read: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherDashboard.lists() });
    },
  });
};
