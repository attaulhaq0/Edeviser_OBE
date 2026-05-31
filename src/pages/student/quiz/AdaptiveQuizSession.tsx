import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { computeScore } from "@/lib/quizScore";
import { deriveCorrectness } from "@/lib/quizCorrectness";
import { createIdempotentRunner } from "@/lib/idempotentRunner";
import QuestionPreview from "@/components/shared/QuestionPreview";
import PracticeModeBanner from "@/components/shared/PracticeModeBanner";
import { usePracticeModeConfig } from "@/hooks/usePracticeMode";
import { useQuizRecoveryBlock } from "@/hooks/useQuizRecoveryBlock";
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
  const { t } = useTranslation("student");

  const startQuiz = useStartAdaptiveQuiz();
  const selectNext = useSelectNextQuestion();
  const submitAttempt = useSubmitQuizAttempt();
  const { data: practiceModeConfig } = usePracticeModeConfig(quizId ?? "");
  const { user } = useAuth();

  const isPracticeMode = practiceModeConfig?.practice_mode_enabled ?? false;

  // ─── Active recovery check ────────────────────────────────────────────────
  const { data: activeRecovery, isLoading: recoveryLoading } =
    useQuizRecoveryBlock(quizId, user?.id);

  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [timeRemaining, setTimeRemaining] =
    useState<number>(DEFAULT_TIME_LIMIT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [practiceFeedback, setPracticeFeedback] =
    useState<PracticeFeedback | null>(null);

  const hasInitialized = useRef(false);
  // Latest-ref pattern: always points at the most recent `finalizeQuiz` closure
  // so the timer effect can finalize with current session state without listing
  // `finalizeQuiz` in its dependency array (R3.1, R3.2).
  const finalizeRef = useRef<() => Promise<void>>();
  // Latest-ref for the translation function so the timer effect can localize the
  // "time up" toast without listing `t` in its dependency array (keeps the
  // single-interval-per-attempt invariant from R3.1/R3.4 intact).
  const tRef = useRef(t);
  // Double-finalize guard: ensures finalization runs at most once across timer
  // expiry, unmount, and manual submit (R3.4). The at-most-once logic lives in
  // the pure `createIdempotentRunner` helper so it is testable in isolation.
  const finalizeGuardRef = useRef(createIdempotentRunner());

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
      toast.error(t("quiz.toast.startFailed"));
      setInitializing(false);
    }
  };

  const finalizeQuiz = async () => {
    if (!session) return;
    // Guard against duplicate finalization (timer expiry racing with unmount or
    // a manual submit). The runner claims the guard synchronously and runs the
    // submission at most once; a failed submission releases the guard so a retry
    // is possible (R3.4).
    try {
      await finalizeGuardRef.current.run(async () => {
        const totalQuestions = session.currentQuestion?.total_questions ?? 1;
        // Score is computed from the current session state at the moment of
        // finalization, so timer expiry uses live answers, never stale ones
        // (R3.1, R3.3).
        const score = computeScore(session.totalCorrect, totalQuestions);

        await submitAttempt.mutateAsync({
          quiz_attempt_id: session.attemptId,
          answers: session.answers,
          score,
          ...(isPracticeMode ? { mode: "practice" as const } : {}),
        });

        navigate(`/student/quizzes/${quizId}/review/${session.attemptId}`, {
          replace: true,
        });
      });
    } catch {
      // The runner already released the guard so finalization can be retried.
      toast.error(t("quiz.toast.submitFailed"));
    }
  };

  // Keep the latest `finalizeQuiz` closure in a ref so the timer effect always
  // invokes the current routine (current session state) without depending on it
  // in its dependency array — this removes the stale-closure risk and the need
  // for an `eslint-disable` (R3.2).
  useEffect(() => {
    finalizeRef.current = finalizeQuiz;
    tRef.current = t;
  });

  // ─── Timer ──────────────────────────────────────────────────────────────────
  // Keyed on the attempt id so a single interval runs per attempt. On expiry it
  // finalizes via the latest-ref (current session state) exactly once, and the
  // interval is always cleared on unmount or attempt change (R3.1, R3.4).
  useEffect(() => {
    if (!session?.attemptId) return;

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          if (!finalizeGuardRef.current.hasCompleted) {
            toast.info(tRef.current("quiz.toast.timeUp"));
            void finalizeRef.current?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [session?.attemptId]);

  // ─── Initialize session ─────────────────────────────────────────────────────
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
      toast.warning(t("quiz.toast.selectAnswer"));
      return;
    }

    setIsSubmitting(true);
    const responseTimeMs = Date.now() - session.questionStartTime;
    const questionId = session.currentQuestion.question.id;
    // Derive correctness from real evidence (server-evaluated value when the
    // backend provides one, else equality against the question's correct
    // answer) — never a hardcoded `true` (R2.1, R2.6). This single value drives
    // the feedback UI, the recorded `previous_answer_correct`, and the
    // correct-count increment so they always agree (R2.4).
    const wasCorrect = deriveCorrectness({
      selectedAnswer,
      correctAnswer: session.currentQuestion.question.correct_answer,
    });

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
        // In practice mode, show feedback before advancing. Record the same
        // derived correctness into the running correct-count so the finalized
        // score matches the feedback the student saw.
        setSession((prev) =>
          prev
            ? {
                ...prev,
                totalCorrect: prev.totalCorrect + (wasCorrect ? 1 : 0),
              }
            : prev
        );
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

      const updatedTotalCorrect = session.totalCorrect + (wasCorrect ? 1 : 0);

      if (response.session_complete) {
        const totalQuestions = response.total_questions;
        const score =
          totalQuestions > 0
            ? Math.round((updatedTotalCorrect / totalQuestions) * 100)
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
              totalCorrect: updatedTotalCorrect,
            }
          : prev
      );
      setSelectedAnswer("");
    } catch {
      toast.error(t("quiz.toast.nextFailed"));
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
        toast.error(t("quiz.toast.submitFailed"));
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
        <h2 className="text-lg font-bold tracking-tight">
          {t("quiz.recovery.title")}
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          {t("quiz.recovery.body")}
        </p>
        <Link
          to={`/student/courses/${activeRecovery.course_id}/recovery/${activeRecovery.clo_id}`}
        >
          <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
            {t("quiz.recovery.cta")}
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
        <p className="text-sm font-medium text-gray-500">{t("quiz.loading")}</p>
      </div>
    );
  }

  if (!session?.currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-gray-500">
          {t("quiz.unableToLoad")}
        </p>
      </div>
    );
  }

  const { currentQuestion } = session;
  const { question, question_number, total_questions } = currentQuestion;
  const progressPercent = (question_number / total_questions) * 100;
  const isLowTime = timeRemaining < 60;

  // Correct-answer reveal for practice feedback (R2.2). The current question is
  // the one just answered (it only advances on "Next"), so its `correct_answer`
  // is the answer to reveal. For MCQ we surface the option's text; otherwise the
  // raw answer value.
  const correctAnswerKey = question.correct_answer ?? null;
  const correctAnswerText =
    question.question_type === "mcq" && question.options
      ? question.options.find((o) => o.key === correctAnswerKey)?.text ??
        correctAnswerKey
      : correctAnswerKey;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Practice Mode Banner */}
      {isPracticeMode && <PracticeModeBanner />}

      {/* Header: Progress + Timer */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            {t("quiz.questionProgress", {
              number: question_number,
              total: total_questions,
            })}
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
        showCorrectAnswer={!!practiceFeedback && correctAnswerKey != null}
        correctAnswer={correctAnswerKey ?? undefined}
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
                    {t("quiz.feedback.correctTitle")}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("quiz.feedback.correctBody")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {t("quiz.feedback.incorrectTitle")}
                  </p>
                  {correctAnswerText != null && correctAnswerText !== "" ? (
                    <p
                      className="text-xs text-gray-500 mt-0.5"
                      data-testid="practice-correct-answer-reveal"
                    >
                      {t("quiz.feedback.correctAnswerRevealPrefix")}{" "}
                      <span className="font-semibold text-gray-700">
                        {correctAnswerText}
                      </span>
                      .
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("quiz.feedback.reviewLater")}
                    </p>
                  )}
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
              ? t("quiz.finishQuiz")
              : t("quiz.nextQuestion")}
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
                {t("quiz.loadingButton")}
              </>
            ) : question_number === total_questions ? (
              t("quiz.finishQuiz")
            ) : (
              t("quiz.submitAnswer")
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdaptiveQuizSession;
