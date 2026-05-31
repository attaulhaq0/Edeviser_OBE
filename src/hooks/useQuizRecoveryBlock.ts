// =============================================================================
// useQuizRecoveryBlock — active mastery-recovery block for a quiz
//
// Relocated from the in-page `useQuery` in `AdaptiveQuizSession.tsx`. Resolves
// the quiz's CLO ids and checks whether the student has an active mastery
// recovery pathway on any of them; if so, the quiz is blocked until recovery is
// complete. Returns the first matching active recovery, or `null`.
//
// Keeps all Supabase access in `src/hooks/` and uses the project's standard
// TanStack Query conventions (query keys + typed responses).
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface QuizRecoveryBlock {
  id: string;
  clo_id: string;
  course_id: string;
  status: string;
}

export const useQuizRecoveryBlock = (
  quizId: string | undefined,
  studentId: string | undefined
) => {
  return useQuery({
    queryKey: [...queryKeys.masteryRecovery.all, "quiz-block", quizId],
    queryFn: async (): Promise<QuizRecoveryBlock | null> => {
      if (!studentId || !quizId) return null;

      // Resolve the quiz's CLO ids.
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("clo_ids")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError || !quiz) return null;

      const cloIds = (quiz.clo_ids ?? []) as string[];
      if (cloIds.length === 0) return null;

      // Check for an active recovery on any of the quiz's CLOs.
      const { data: recoveries, error: recoveryError } = await supabase
        .from("mastery_recovery_pathways")
        .select("id, clo_id, course_id, status")
        .eq("student_id", studentId)
        .eq("status", "active")
        .in("clo_id", cloIds)
        .limit(1);

      if (recoveryError || !recoveries || recoveries.length === 0) return null;
      return recoveries[0] ?? null;
    },
    enabled: !!quizId && !!studentId,
  });
};
