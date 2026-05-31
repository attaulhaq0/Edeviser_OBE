// =============================================================================
// useQuizReview — post-quiz review data (attempt + ordered questions)
//
// Relocated from the in-page `useQuizReview` hook in `PostQuizReview.tsx`.
// Loads a quiz attempt and the question_bank rows for its question sequence,
// returning them ordered to match the sequence and mapped to typed
// `ReviewQuestion`s.
//
// Keeps all Supabase access in `src/hooks/` and uses the project's standard
// TanStack Query conventions (query keys + typed responses).
//
// _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewQuestion {
  id: string;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer" | "fill_in_blank";
  options: { key: string; text: string }[] | null;
  correct_answer: { value: string; explanation?: string };
  explanation: string | null;
  bloom_level: number;
  clo_id: string;
  clo_title?: string;
}

export interface QuizReviewData {
  attempt: {
    id: string;
    quiz_id: string;
    score: number;
    answers: Record<string, string>;
    question_sequence: { question_id: string }[];
  };
  questions: ReviewQuestion[];
}

// ─── useQuizReview ─────────────────────────────────────────────────────────────

export const useQuizReview = (
  _quizId: string | undefined,
  attemptId: string | undefined
) => {
  return useQuery<QuizReviewData>({
    queryKey: [...queryKeys.quizAttempts.detail(attemptId ?? ""), "review"],
    queryFn: async (): Promise<QuizReviewData> => {
      if (!attemptId) throw new Error("Missing attemptId");

      // Fetch the quiz attempt.
      const { data: attempt, error: attemptError } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, answers, question_sequence")
        .eq("id", attemptId)
        .maybeSingle();

      if (attemptError) throw attemptError;
      if (!attempt) throw new Error("Quiz attempt not found");

      const rawSequence = (attempt.question_sequence ?? []) as {
        question_id: string;
      }[];
      const rawAnswers = (attempt.answers ?? {}) as Record<string, string>;

      const parsedAttempt: QuizReviewData["attempt"] = {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        score: attempt.score ?? 0,
        answers: rawAnswers,
        question_sequence: rawSequence,
      };

      // Extract question IDs from the sequence.
      const questionIds: string[] = rawSequence.map((q) => q.question_id);

      if (questionIds.length === 0) {
        return { attempt: parsedAttempt, questions: [] };
      }

      // Fetch questions from question_bank.
      const { data: questions, error: questionsError } = await supabase
        .from("question_bank")
        .select(
          "id, question_text, question_type, options, correct_answer, explanation, bloom_level, clo_id"
        )
        .in("id", questionIds);

      if (questionsError) throw questionsError;

      // Order questions by sequence and map to typed ReviewQuestion.
      const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));
      const orderedQuestions: ReviewQuestion[] = questionIds
        .map((qId) => questionMap.get(qId))
        .filter((q): q is NonNullable<typeof q> => q != null)
        .map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type as ReviewQuestion["question_type"],
          options: q.options as ReviewQuestion["options"],
          correct_answer: q.correct_answer as ReviewQuestion["correct_answer"],
          explanation: q.explanation,
          bloom_level: q.bloom_level,
          clo_id: q.clo_id,
          clo_title: q.clo_id,
        }));

      return { attempt: parsedAttempt, questions: orderedQuestions };
    },
    enabled: !!attemptId,
  });
};
