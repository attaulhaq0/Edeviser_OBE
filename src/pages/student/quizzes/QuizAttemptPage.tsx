import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useQuiz,
  useQuizQuestions,
  useQuizAttempts,
  useSubmitQuizAttempt,
} from '@/hooks/useQuizzes';
import { useAuth } from '@/hooks/useAuth';
import { getActiveExtraAttemptToken, consumeExtraAttemptToken, canAttemptQuiz } from '@/lib/extraQuizAttempt';
import QuizQuestionCard from '@/components/shared/QuizQuestionCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Clock, Loader2, AlertTriangle, Ticket } from 'lucide-react';
import { toast } from 'sonner';

// ─── Timer Hook ──────────────────────────────────────────────────────────────

function useCountdown(totalSeconds: number | null, onExpire: () => void) {
  const onExpireRef = useRef(onExpire);
  const counterRef = useRef(totalSeconds ?? 0);
  const [remaining, setRemaining] = useState(totalSeconds ?? 0);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (totalSeconds === null || totalSeconds <= 0) return;

    counterRef.current = totalSeconds;

    // Use requestAnimationFrame to defer the initial state sync
    const raf = requestAnimationFrame(() => {
      setRemaining(totalSeconds);
    });

    const interval = setInterval(() => {
      counterRef.current -= 1;
      if (counterRef.current <= 0) {
        clearInterval(interval);
        setRemaining(0);
        onExpireRef.current();
      } else {
        setRemaining(counterRef.current);
      }
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, [totalSeconds]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLow = remaining > 0 && remaining <= 60;

  return { remaining, display, isLow };
}

// ─── Quiz Attempt Page ───────────────────────────────────────────────────────

const QuizAttemptPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const { data: quiz, isLoading: isLoadingQuiz } = useQuiz(quizId);
  const { data: questions, isLoading: isLoadingQuestions } = useQuizQuestions(quizId);
  const { data: attempts, isLoading: isLoadingAttempts } = useQuizAttempts(quizId, studentId);
  const submitAttempt = useSubmitQuizAttempt();

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());

  const attemptCount = attempts?.length ?? 0;
  const maxAttempts = quiz?.max_attempts ?? 1;
  const timeLimitSeconds = quiz?.time_limit_minutes ? quiz.time_limit_minutes * 60 : null;

  // Check for extra quiz attempt token from marketplace
  const { data: extraTokenData } = useQuery({
    queryKey: ['marketplace', 'extraAttemptToken', studentId, quizId],
    queryFn: () => getActiveExtraAttemptToken(studentId),
    enabled: !!studentId && attemptCount >= maxAttempts,
  });

  const hasExtraToken = !!extraTokenData?.purchaseId;
  const canAttempt = canAttemptQuiz(attemptCount, maxAttempts, hasExtraToken);
  const isUsingExtraToken = attemptCount >= maxAttempts && hasExtraToken;

  const handleSubmit = useCallback(() => {
    if (submitted || !quizId || !studentId) return;
    setSubmitted(true);

    const doSubmit = async () => {
      // Consume extra attempt token if this is a bonus attempt
      if (isUsingExtraToken && extraTokenData?.purchaseId) {
        try {
          await consumeExtraAttemptToken(extraTokenData.purchaseId);
        } catch {
          toast.error('Failed to consume extra attempt token');
          setSubmitted(false);
          return;
        }
      }

      submitAttempt.mutate(
        {
          quiz_id: quizId,
          student_id: studentId,
          answers,
          started_at: startedAt,
          attempt_number: attemptCount + 1,
        },
        {
          onSuccess: () => {
            toast.success('Quiz submitted successfully');
          },
          onError: (err) => {
            toast.error(err.message);
            setSubmitted(false);
          },
        },
      );
    };

    doSubmit();
  }, [submitted, quizId, studentId, answers, startedAt, attemptCount, submitAttempt, isUsingExtraToken, extraTokenData]);

  const { display: timerDisplay, isLow: timerIsLow } = useCountdown(
    started ? timeLimitSeconds : null,
    handleSubmit,
  );

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const isLoading = isLoadingQuiz || isLoadingQuestions || isLoadingAttempts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Quiz not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  // Already submitted view
  if (submitted) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Quiz Submitted</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your answers have been recorded. Auto-gradable questions are scored immediately.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back to Quizzes
          </Button>
        </Card>
      </div>
    );
  }

  // Max attempts reached
  if (!canAttempt) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
        </div>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Maximum Attempts Reached</h2>
          <p className="text-sm text-gray-500">
            You have used all {maxAttempts} attempt{maxAttempts > 1 ? 's' : ''} for this quiz.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            <Ticket className="inline h-3 w-3 me-1" />
            Purchase an Extra Quiz Attempt token from the Marketplace to try again.
          </p>
        </Card>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
        </div>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8">
          <h2 className="text-lg font-bold tracking-tight mb-4">Quiz Information</h2>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            {quiz.description && <p>{quiz.description}</p>}
            <p>Questions: {questions?.length ?? 0}</p>
            <p>
              Total Points:{' '}
              {questions?.reduce((sum, q) => sum + q.points, 0) ?? 0}
            </p>
            {quiz.time_limit_minutes && (
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Time Limit: {quiz.time_limit_minutes} minutes
              </p>
            )}
            <p>
              Attempts: {attemptCount} / {maxAttempts}
            </p>
            {isUsingExtraToken && (
              <p className="flex items-center gap-1 text-purple-600 font-semibold">
                <Ticket className="h-4 w-4" /> Using Extra Attempt Token
              </p>
            )}
          </div>
          <Button
            onClick={() => setStarted(true)}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          >
            Start Quiz
          </Button>
        </Card>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header with timer */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50 py-3">
        <h1 className="text-xl font-bold tracking-tight truncate">{quiz.title}</h1>
        {timeLimitSeconds && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
              timerIsLow
                ? 'bg-red-50 text-red-600 animate-pulse'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Clock className="h-4 w-4" />
            {timerDisplay}
          </div>
        )}
      </div>

      {/* Questions */}
      {questions?.map((q, idx) => (
        <QuizQuestionCard
          key={q.id}
          questionNumber={idx + 1}
          questionText={q.question_text}
          questionType={
            q.question_type === 'mcq_single' || q.question_type === 'mcq_multi'
              ? 'mcq'
              : q.question_type
          }
          options={q.options ?? undefined}
          selectedAnswer={answers[q.id] as string | undefined}
          onAnswer={(answer) => handleAnswer(q.id, answer)}
          points={q.points}
        />
      ))}

      {/* Submit */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSubmit}
          disabled={submitAttempt.isPending}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
        >
          {submitAttempt.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          Submit Quiz
        </Button>
      </div>
    </div>
  );
};

export default QuizAttemptPage;
