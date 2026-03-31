// =============================================================================
// Quiz Auto-Grader — Pure functions for client-side quiz grading
// =============================================================================

export type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_answer' | 'fill_blank';

export interface GradableQuestion {
  id: string;
  question_type: QuestionType;
  correct_answer: string | string[];
  points: number;
}

export interface QuestionGradeResult {
  questionId: string;
  score: number;
  maxPoints: number;
  autoGradable: boolean;
  isCorrect: boolean | null; // null for manual-graded questions
}

export interface QuizGradeResult {
  autoScore: number;
  totalPoints: number;
  totalAutoGradablePoints: number;
  hasManualQuestions: boolean;
  gradingStatus: 'auto_graded' | 'pending_manual' | 'fully_graded';
  scorePercent: number | null;
  perQuestion: QuestionGradeResult[];
}

/**
 * Grade a single question. Returns score and whether it's auto-gradable.
 * Short answer questions are flagged for manual teacher grading.
 */
export function gradeQuestion(
  question: GradableQuestion,
  studentAnswer: string | string[] | undefined,
): QuestionGradeResult {
  const { id, question_type, correct_answer, points } = question;

  if (!studentAnswer) {
    return {
      questionId: id,
      score: 0,
      maxPoints: points,
      autoGradable: question_type !== 'short_answer',
      isCorrect: question_type === 'short_answer' ? null : false,
    };
  }

  switch (question_type) {
    case 'mcq_single':
    case 'true_false': {
      const correct = typeof correct_answer === 'string'
        ? correct_answer
        : correct_answer[0] ?? '';
      const answer = typeof studentAnswer === 'string'
        ? studentAnswer
        : studentAnswer[0] ?? '';
      const isCorrect = answer.trim().toLowerCase() === correct.trim().toLowerCase();
      return {
        questionId: id,
        score: isCorrect ? points : 0,
        maxPoints: points,
        autoGradable: true,
        isCorrect,
      };
    }

    case 'mcq_multi': {
      const correctSet = new Set(
        (Array.isArray(correct_answer) ? correct_answer : [correct_answer])
          .map((a) => a.trim().toLowerCase()),
      );
      const answerSet = new Set(
        (Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer])
          .map((a) => a.trim().toLowerCase()),
      );
      const isCorrect =
        correctSet.size === answerSet.size &&
        [...correctSet].every((v) => answerSet.has(v));
      return {
        questionId: id,
        score: isCorrect ? points : 0,
        maxPoints: points,
        autoGradable: true,
        isCorrect,
      };
    }

    case 'fill_blank': {
      const correct = typeof correct_answer === 'string'
        ? correct_answer
        : correct_answer[0] ?? '';
      const answer = typeof studentAnswer === 'string'
        ? studentAnswer
        : studentAnswer[0] ?? '';
      const isCorrect = answer.trim().toLowerCase() === correct.trim().toLowerCase();
      return {
        questionId: id,
        score: isCorrect ? points : 0,
        maxPoints: points,
        autoGradable: true,
        isCorrect,
      };
    }

    case 'short_answer':
      return {
        questionId: id,
        score: 0,
        maxPoints: points,
        autoGradable: false,
        isCorrect: null,
      };

    default:
      return {
        questionId: id,
        score: 0,
        maxPoints: points,
        autoGradable: true,
        isCorrect: false,
      };
  }
}

/**
 * Grade an entire quiz attempt. Auto-grades MCQ, true/false, fill-in-blank.
 * Flags short answer questions for manual teacher grading.
 */
export function gradeQuiz(
  questions: GradableQuestion[],
  answers: Record<string, string | string[]>,
): QuizGradeResult {
  const perQuestion = questions.map((q) => gradeQuestion(q, answers[q.id]));

  const autoScore = perQuestion
    .filter((r) => r.autoGradable)
    .reduce((sum, r) => sum + r.score, 0);

  const totalPoints = perQuestion.reduce((sum, r) => sum + r.maxPoints, 0);

  const totalAutoGradablePoints = perQuestion
    .filter((r) => r.autoGradable)
    .reduce((sum, r) => sum + r.maxPoints, 0);

  const hasManualQuestions = perQuestion.some((r) => !r.autoGradable);
  const gradingStatus = hasManualQuestions ? 'pending_manual' : 'fully_graded';

  const scorePercent =
    !hasManualQuestions && totalPoints > 0
      ? Math.round((autoScore / totalPoints) * 10000) / 100
      : null;

  return {
    autoScore,
    totalPoints,
    totalAutoGradablePoints,
    hasManualQuestions,
    gradingStatus,
    scorePercent,
    perQuestion,
  };
}
