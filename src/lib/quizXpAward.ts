// =============================================================================
// Quiz XP Award — Awards XP on quiz completion (50 on-time, 25 if late)
// =============================================================================

import { supabase } from "@/lib/supabase";

const QUIZ_XP_ON_TIME = 50;
const QUIZ_XP_LATE = 25;

interface QuizXpInput {
  studentId: string;
  quizId: string;
  attemptId: string;
  dueDate: string;
  submittedAt: string;
}

/**
 * Award XP for quiz completion using the same schedule as assignments:
 * - 50 XP if submitted on-time (before due date)
 * - 25 XP if submitted late (after due date)
 *
 * Calls the award-xp Edge Function with source='quiz_completion'.
 */
export async function awardQuizXp(input: QuizXpInput): Promise<void> {
  const { studentId, quizId, attemptId, dueDate, submittedAt } = input;

  const isLate = new Date(submittedAt) > new Date(dueDate);
  const xpAmount = isLate ? QUIZ_XP_LATE : QUIZ_XP_ON_TIME;

  try {
    const { error } = await supabase.functions.invoke("award-xp", {
      body: {
        student_id: studentId,
        xp_amount: xpAmount,
        source: "quiz_completion",
        reference_id: `quiz:${quizId}:${attemptId}`,
        note: isLate
          ? `Late quiz completion: ${quizId}`
          : `On-time quiz completion: ${quizId}`,
      },
    });

    if (error) {
      console.error("[QuizXP] Failed to award XP:", error.message);
    }
  } catch (err) {
    console.error("[QuizXP] Unexpected error awarding XP:", err);
  }
}

export { QUIZ_XP_ON_TIME, QUIZ_XP_LATE };
