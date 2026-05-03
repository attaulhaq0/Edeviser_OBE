// =============================================================================
// useIndependenceScore — Hooks for fetching independence scores per student/CLO
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IndependenceScoreResult {
  clo_id: string;
  score: number; // 0.0 to 1.0
  total_submissions: number;
  ai_assisted_submissions: number;
}

// ─── useIndependenceScore — single CLO score ─────────────────────────────────

/**
 * Fetch the independence score for a single student + CLO combination.
 *
 * Independence Score = 1 - (AI-assisted submissions / total submissions)
 * AI-assisted = submissions where the student had a tutor conversation
 * on the same CLO within 1 hour before submission.
 */
export const useIndependenceScore = (studentId: string, cloId: string) => {
  return useQuery({
    queryKey: [...queryKeys.tutorConversations.lists(), 'independence', studentId, cloId],
    queryFn: async (): Promise<IndependenceScoreResult | null> => {
      if (!studentId || !cloId) return null;

      const result = await fetchIndependenceForCLOs(studentId, [cloId]);
      return result[0] ?? null;
    },
    enabled: !!studentId && !!cloId,
    staleTime: 60_000,
  });
};

// ─── useIndependenceScores — all CLOs in a course ────────────────────────────

/**
 * Fetch independence scores for all CLOs in a course for a given student.
 */
export const useIndependenceScores = (studentId: string, courseId: string) => {
  return useQuery({
    queryKey: [...queryKeys.tutorConversations.lists(), 'independence', studentId, 'course', courseId],
    queryFn: async (): Promise<IndependenceScoreResult[]> => {
      if (!studentId || !courseId) return [];

      // 1. Get all CLOs for this course
      const { data: clos, error: cloError } = await supabase
        .from('learning_outcomes')
        .select('id')
        .eq('course_id', courseId)
        .eq('type', 'CLO');

      if (cloError) throw cloError;
      if (!clos || clos.length === 0) return [];

      const cloIds = clos.map((c) => c.id);
      return fetchIndependenceForCLOs(studentId, cloIds);
    },
    enabled: !!studentId && !!courseId,
    staleTime: 60_000,
  });
};

// ─── Internal helper ─────────────────────────────────────────────────────────

async function fetchIndependenceForCLOs(
  studentId: string,
  cloIds: string[],
): Promise<IndependenceScoreResult[]> {
  const results: IndependenceScoreResult[] = [];

  for (const cloId of cloIds) {
    // Get all submissions for this student that are linked to assignments covering this CLO
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submissions, error: subError } = await (supabase as any)
      .from('submissions')
      .select('id, submitted_at, assignment_id')
      .eq('student_id', studentId);

    if (subError) {
      console.error('Failed to fetch submissions:', subError.message);
      results.push({ clo_id: cloId, score: 1.0, total_submissions: 0, ai_assisted_submissions: 0 });
      continue;
    }

    if (!submissions || submissions.length === 0) {
      results.push({ clo_id: cloId, score: 1.0, total_submissions: 0, ai_assisted_submissions: 0 });
      continue;
    }

    // Get tutor conversations scoped to this CLO
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversations, error: convError } = await (supabase as any)
      .from('tutor_conversations')
      .select('id, created_at, updated_at, clo_scope')
      .eq('student_id', studentId)
      .contains('clo_scope', [cloId]);

    if (convError) {
      console.error('Failed to fetch conversations:', convError.message);
      results.push({
        clo_id: cloId,
        score: 1.0,
        total_submissions: submissions.length,
        ai_assisted_submissions: 0,
      });
      continue;
    }

    // Count AI-assisted submissions: those preceded by a tutor conversation
    // on the same CLO within 1 hour before submission
    let aiAssisted = 0;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    for (const sub of submissions) {
      const submittedAt = new Date(sub.submitted_at).getTime();

      const wasAiAssisted = (conversations ?? []).some(
        (conv: { updated_at: string }) => {
          const convTime = new Date(conv.updated_at).getTime();
          const timeDiff = submittedAt - convTime;
          return timeDiff >= 0 && timeDiff <= ONE_HOUR_MS;
        },
      );

      if (wasAiAssisted) {
        aiAssisted++;
      }
    }

    const totalSubmissions = submissions.length;
    const score = totalSubmissions > 0 ? 1 - aiAssisted / totalSubmissions : 1.0;

    results.push({
      clo_id: cloId,
      score: Math.max(0, Math.min(1, score)),
      total_submissions: totalSubmissions,
      ai_assisted_submissions: aiAssisted,
    });
  }

  return results;
}
