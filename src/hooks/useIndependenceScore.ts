import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { calculateIndependenceScore } from '@/lib/independenceCalculator';

export interface IndependenceScoreData {
  clo_id: string;
  clo_title: string;
  score: number;
  totalSubmissions: number;
  aiAssistedSubmissions: number;
}

/**
 * Hook for fetching independence score for a specific student and CLO.
 * Requirement 28: Independence Score Tracking
 */
export const useIndependenceScore = (studentId: string, cloId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.independenceScore.detail(studentId, cloId ?? ''),
    queryFn: async (): Promise<number> => {
      if (!studentId || !cloId) return 1.0;

      // Get total submissions for this CLO
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, submitted_at, assignment_id')
        .eq('student_id', studentId);

      // Filter submissions linked to this CLO via assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .contains('clo_ids', [cloId]);

      const assignmentIds = new Set((assignments ?? []).map((a) => a.id as string));
      const cloSubmissions = (submissions ?? []).filter(
        (s) => assignmentIds.has(s.assignment_id as string),
      );

      if (cloSubmissions.length === 0) return 1.0;

      // Get tutor conversations on this CLO
      const { data: conversations } = await supabase
        .from('tutor_conversations')
        .select('id, updated_at')
        .eq('student_id', studentId)
        .contains('clo_scope', [cloId]);

      // Count AI-assisted submissions (preceded by tutor conversation within 2 hours)
      let aiAssistedCount = 0;
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

      for (const sub of cloSubmissions) {
        const submittedAt = new Date(sub.submitted_at as string).getTime();
        const wasAiAssisted = (conversations ?? []).some((conv) => {
          const convTime = new Date(conv.updated_at as string).getTime();
          return convTime < submittedAt && submittedAt - convTime <= TWO_HOURS_MS;
        });
        if (wasAiAssisted) aiAssistedCount++;
      }

      return calculateIndependenceScore({
        totalSubmissions: cloSubmissions.length,
        aiAssistedSubmissions: aiAssistedCount,
      });
    },
    enabled: !!user && !!studentId && !!cloId,
  });
};

/**
 * Hook for fetching independence scores for all CLOs in a course.
 */
export const useIndependenceScores = (studentId: string, courseId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.independenceScore.course(studentId, courseId),
    queryFn: async (): Promise<IndependenceScoreData[]> => {
      if (!studentId || !courseId) return [];

      // Get CLOs for the course
      const { data: clos } = await supabase
        .from('clos')
        .select('id, title')
        .eq('course_id', courseId);

      if (!clos || clos.length === 0) return [];

      // Get all submissions for this student
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, submitted_at, assignment_id')
        .eq('student_id', studentId);

      // Get assignments for this course
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, clo_ids')
        .eq('course_id', courseId);

      // Get tutor conversations for this student and course
      const { data: conversations } = await supabase
        .from('tutor_conversations')
        .select('id, updated_at, clo_scope')
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

      return clos.map((clo) => {
        const cloId = clo.id as string;

        // Find assignments linked to this CLO
        const cloAssignmentIds = new Set(
          (assignments ?? [])
            .filter((a) => {
              const ids = a.clo_ids as string[] | null;
              return ids && ids.includes(cloId);
            })
            .map((a) => a.id as string),
        );

        // Filter submissions for this CLO
        const cloSubmissions = (submissions ?? []).filter(
          (s) => cloAssignmentIds.has(s.assignment_id as string),
        );

        // Filter conversations for this CLO
        const cloConversations = (conversations ?? []).filter((conv) => {
          const scope = conv.clo_scope as string[] | null;
          return scope && scope.includes(cloId);
        });

        // Count AI-assisted submissions
        let aiAssistedCount = 0;
        for (const sub of cloSubmissions) {
          const submittedAt = new Date(sub.submitted_at as string).getTime();
          const wasAiAssisted = cloConversations.some((conv) => {
            const convTime = new Date(conv.updated_at as string).getTime();
            return convTime < submittedAt && submittedAt - convTime <= TWO_HOURS_MS;
          });
          if (wasAiAssisted) aiAssistedCount++;
        }

        const score = calculateIndependenceScore({
          totalSubmissions: cloSubmissions.length,
          aiAssistedSubmissions: aiAssistedCount,
        });

        return {
          clo_id: cloId,
          clo_title: clo.title as string,
          score,
          totalSubmissions: cloSubmissions.length,
          aiAssistedSubmissions: aiAssistedCount,
        };
      });
    },
    enabled: !!user && !!studentId && !!courseId,
  });
};
