import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import QuestionPreview from "@/components/shared/QuestionPreview";
import PracticeModeBanner from "@/components/shared/PracticeModeBanner";
import { usePracticeModeConfig } from "@/hooks/usePracticeMode";
import { useAuth } from "@/hooks/useAuth";
import {
  useStartAdaptiveQuiz,
  useSelectNextQuestion,
  useSubmitQuizAttempt,
  type SelectQuestionResponse,
} from "@/hooks/useAdaptiveQuiz";

interface SessionState {
  attemptId: string;
  answers: Record<string, string>;
  responseTimes: Record<string, number>;
  currentQuestion: SelectQuestionResponse | null;
  questionStartTime: number;
  score: number;
  totalCorrect: number;
  timeLimit: number; // seconds
}

interface PracticeFeedback {
  wasCorrect: boolean;
  selectedAnswer: string;
  nextResponse: SelectQuestionResponse | null;
  isSessionComplete: boolean;
  updatedAnswers: Record<string, string>;
  updatedTimes: Record<string, number>;
}

const DEFAULT_TIME_LIMIT = 1800; // 30 minutes

const AdaptiveQuizSession = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const startQuiz = useStartAdaptiveQuiz();
  const selectNext = useSelectNextQuestion();
  const submitAttempt = useSubmitQuizAttempt();
  const { data: practiceModeConfig } = usePracticeModeConfig(quizId ?? "");
  const { user } = useAuth();

  const isPracticeMode = practiceModeConfig?.practice_mode_enabled ?? false;

  // ─── Active recovery check ────────────────────────────────────────────────
  const { data: activeRecovery, isLoading: recoveryLoading } = useQuery({
    queryKey: [...queryKeys.masteryRecovery.all, "quiz-block", quizId],
    queryFn: async () => {
      if (!user?.id || !quizId) return null;

      // Fetch quiz CLO IDs
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("clo_ids")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError || !quiz) return null;

      const cloIds = (quiz.clo_ids ?? []) as string[];
      if (cloIds.length === 0) return null;

      // Check for active recovery on any of the quiz's CLOs
      const { data: recoveries, error: recoveryError } = await supabase
        .from("mastery_recovery_pathways")
        .select("id, clo_id, course_id, status")
        .eq("student_id", user.id)
        .eq("status", "active")
        .in("clo_id", cloIds)
        .limit(1);

      if (recoveryError || !recoveries || recoveries.length === 0) return null;
      return recoveries[0];
    },
    enabled: !!quizId && !!user?.id,
  });

  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [timeRemaining, setTimeRemaining] =
    useState<number>(DEFAULT_TIME_LIMIT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [practiceFeedback, setPracticeFeedback] =
    useState<PracticeFeedback | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitialized = useRef(false);

  // ─── Initialize session ─────────────────────────────────────────────────────

  const initSession = async () => {
    if (!quizId) return;
    try {
      const attempt = await startQuiz.mutateAsync({ quiz_id: quizId });
      const firstQuestion = await selectNext.mutateAsync({
        quiz_id: quizId,
        quiz_attempt_id: attempt.id,
      });

      setSession({
        attemptId: attempt.id,
        answers: {},
        responseTimes: {},
        currentQuestion: firstQuestion,
        questionStartTime: Date.now(),
        score: 0,
        totalCorrect: 0,
        timeLimit: DEFAULT_TIME_LIMIT,
      });
      setTimeRemaining(DEFAULT_TIME_LIMIT);
      setInitializing(false);
    } catch {
      toast.error("Failed to start quiz. Please try again.");
      setInitializing(false);
    }
  };

  const finalizeQuiz = async () => {
    if (!session) return;
    try {
      const totalQuestions = session.currentQuestion?.total_questions ?? 1;
      const score =
        totalQuestions > 0
          ? Math.round((session.totalCorrect / totalQuestions) * 100)
          : 0;

      await submitAttempt.mutateAsync({
        quiz_attempt_id: session.attemptId,
        answers: session.answers,
        score,
        ...(isPracticeMode ? { mode: "practice" as const } : {}),
      });

      navigate(`/student/quizzes/${quizId}/review/${session.attemptId}`, {
        replace: true,
      });
    } catch {
      toast.error("Failed to submit quiz. Please try again.");
    }
  };

  const handleTimeExpired = useCallback(async () => {
    if (!session) return;
    toast.info("Time is up! Submitting your quiz...");
    await finalizeQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ─── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.attemptId]);

  useEffect(() => {
    if (hasInitialized.current || !quizId || recoveryLoading || activeRecovery)
      return;
    hasInitialized.current = true;
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, recoveryLoading, activeRecovery]);

  const handleSubmitAnswer = async () => {
    if (!session?.currentQuestion || !quizId || isSubmitting) return;
    if (!selectedAnswer) {
      toast.warning("Please select an answer before submitting.");
      return;
    }

    setIsSubmitting(true);
    const responseTimeMs = Date.now() - session.questionStartTime;
    const questionId = session.currentQuestion.question.id;
    const wasCorrect = true; // Server determines correctness; we pass the answer

    const updatedAnswers = { ...session.answers, [questionId]: selectedAnswer };
    const updatedTimes = {
      ...session.responseTimes,
      [questionId]: responseTimeMs,
    };

    try {
      const response = await selectNext.mutateAsync({
        quiz_id: quizId,
        quiz_attempt_id: session.attemptId,
        previous_question_id: questionId,
        previous_answer_correct: wasCorrect,
        previous_response_time_ms: responseTimeMs,
      });

      if (isPracticeMode) {
        // In practice mode, show feedback before advancing
        setPracticeFeedback({
          wasCorrect,
          selectedAnswer,
          nextResponse: response.session_complete ? null : response,
          isSessionComplete: response.session_complete,
          updatedAnswers,
          updatedTimes,
        });
        setIsSubmitting(false);
        return;
      }

      if (response.session_complete) {
        const totalQuestions = response.total_questions;
        const score =
          totalQuestions > 0
            ? Math.round((session.totalCorrect / totalQuestions) * 100)
            : 0;

        await submitAttempt.mutateAsync({
          quiz_attempt_id: session.attemptId,
          answers: updatedAnswers,
          score,
        });

        navigate(`/student/quizzes/${quizId}/review/${session.attemptId}`, {
          replace: true,
        });
        return;
      }

      setSession((prev) =>
        prev
          ? {
              ...prev,
              answers: updatedAnswers,
              responseTimes: updatedTimes,
              currentQuestion: response,
              questionStartTime: Date.now(),
            }
          : prev
      );
      setSelectedAnswer("");
    } catch {
      toast.error("Failed to load next question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!practiceFeedback || !session) return;

    if (practiceFeedback.isSessionComplete) {
      const totalQuestions = session.currentQuestion?.total_questions ?? 1;
      const score =
        totalQuestions > 0
          ? Math.round((session.totalCorrect / totalQuestions) * 100)
          : 0;

      try {
        await submitAttempt.mutateAsync({
          quiz_attempt_id: session.attemptId,
          answers: practiceFeedback.updatedAnswers,
          score,
          ...(isPracticeMode ? { mode: "practice" as const } : {}),
        });

        navigate(`/student/quizzes/${quizId}/review/${session.attemptId}`, {
          replace: true,
        });
      } catch {
        toast.error("Failed to submit quiz. Please try again.");
      }
      return;
    }

    setSession((prev) =>
      prev
        ? {
            ...prev,
            answers: practiceFeedback.updatedAnswers,
            responseTimes: practiceFeedback.updatedTimes,
            currentQuestion: practiceFeedback.nextResponse,
            questionStartTime: Date.now(),
          }
        : prev
    );
    setSelectedAnswer("");
    setPracticeFeedback(null);
  };

  // ─── Format timer ───────────────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Recovery block ──────────────────────────────────────────────────────
  if (!recoveryLoading && activeRecovery) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="p-3 rounded-full bg-amber-50">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">Recovery Required</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          You have an active mastery recovery pathway for a CLO linked to this
          quiz. Complete the recovery steps before retrying.
        </p>
        <Link
          to={`/student/courses/${activeRecovery.course_id}/recovery/${activeRecovery.clo_id}`}
        >
          <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
            Go to Recovery Pathway
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">
          Preparing your adaptive quiz...
        </p>
      </div>
    );
  }

  if (!session?.currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-gray-500">
          Unable to load quiz. Please go back and try again.
        </p>
      </div>
    );
  }

  const { currentQuestion } = session;
  const { question, question_number, total_questions } = currentQuestion;
  const progressPercent = (question_number / total_questions) * 100;
  const isLowTime = timeRemaining < 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Practice Mode Banner */}
      {isPracticeMode && <PracticeModeBanner />}

      {/* Header: Progress + Timer */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            Question {question_number} of {total_questions}
          </p>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold",
              isLowTime ? "bg-red-50 text-red-600" : "bg-slate-50 text-gray-700"
            )}
          >
            <Clock className={cn("h-4 w-4", isLowTime && "text-red-500")} />
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Question */}
      <QuestionPreview
        questionText={question.question_text}
        questionType={
          question.question_type as
            | "mcq"
            | "true_false"
            | "short_answer"
            | "fill_in_blank"
        }
        options={question.options}
        selectedAnswer={practiceFeedback?.selectedAnswer ?? selectedAnswer}
        onAnswerChange={practiceFeedback ? undefined : setSelectedAnswer}
        disabled={!!practiceFeedback}
      />

      {/* Practice Mode Feedback */}
      {isPracticeMode && practiceFeedback && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center gap-3">
            {practiceFeedback.wasCorrect ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">
                    Correct!
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Great job — check the post-quiz review for a detailed
                    explanation.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Incorrect
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review the correct answer and explanation after the quiz.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Submit / Next button */}
      <div className="flex justify-end">
        {isPracticeMode && practiceFeedback ? (
          <Button
            onClick={handleNextQuestion}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-2 active:scale-95 transition-transform duration-100"
          >
            {practiceFeedback.isSessionComplete
              ? "Finish Quiz"
              : "Next Question"}
          </Button>
        ) : (
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || isSubmitting}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-2 active:scale-95 transition-transform duration-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : question_number === total_questions ? (
              "Finish Quiz"
            ) : (
              "Submit Answer"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdaptiveQuizSession;
