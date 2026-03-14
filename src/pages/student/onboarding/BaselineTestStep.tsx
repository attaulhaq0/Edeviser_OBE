import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBaselineQuestions } from '@/hooks/useOnboardingQuestions';
import { useBaselineTestConfig } from '@/hooks/useBaselineTests';
import { useSaveResponses } from '@/hooks/useOnboardingResponses';
import type { OnboardingQuestion } from '@/hooks/useOnboardingQuestions';
import type { WizardStepProps } from './OnboardingWizard';

// ── Types ────────────────────────────────────────────────────────────

interface BaselineOption {
  option_text: string;
}

interface BaselineTestStepProps extends WizardStepProps {
  courseIds: string[];
}

// ── Inline AssessmentTimer (shared component created in Task 6) ──────

interface AssessmentTimerProps {
  totalSeconds: number;
  onExpire: () => void;
  isPaused?: boolean;
}

const AssessmentTimer = ({ totalSeconds, onExpire, isPaused = false }: AssessmentTimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isPaused) return;
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, isPaused]);

  // Pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      // Timer auto-pauses via isPaused or visibility — simplified here
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining < 120;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold ${
        isWarning ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-gray-700'
      }`}
    >
      {isWarning && <AlertTriangle className="h-4 w-4" />}
      <Timer className="h-4 w-4" />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────

const parseBaselineOptions = (question: OnboardingQuestion): BaselineOption[] => {
  if (!Array.isArray(question.options)) return [];
  return question.options as BaselineOption[];
};

// ── Single Course Test ───────────────────────────────────────────────

interface SingleCourseTestProps {
  courseId: string;
  studentId: string;
  assessmentVersion: number;
  onComplete: () => void;
}

const SingleCourseTest = ({
  courseId,
  studentId,
  assessmentVersion,
  onComplete,
}: SingleCourseTestProps) => {
  const { data: questions = [], isLoading: questionsLoading } = useBaselineQuestions(courseId);
  const { data: config } = useBaselineTestConfig(courseId);
  const saveResponses = useSaveResponses();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const timeLimitSeconds = (config?.time_limit_minutes ?? 15) * 60;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const options = currentQuestion ? parseBaselineOptions(currentQuestion) : [];

  // Group questions by CLO for display
  const currentCLO = currentQuestion?.clo_id ?? '';

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);

    // Build responses — unanswered questions get -1 (treated as incorrect)
    const responses = questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id] ?? -1,
    }));

    try {
      await saveResponses.mutateAsync({
        student_id: studentId,
        assessment_type: 'baseline',
        assessment_version: assessmentVersion,
        course_id: courseId,
        responses,
      });
    } finally {
      onComplete();
    }
  }, [submitted, questions, answers, saveResponses, studentId, assessmentVersion, courseId, onComplete]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || submitted) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
    },
    [currentQuestion, submitted],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentIndex, totalQuestions, handleSubmit]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        No baseline questions available for this course.
        <Button onClick={onComplete} className="mt-4 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Timer */}
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <Badge variant="outline" className="text-xs">
          CLO: {currentCLO ? currentCLO.slice(0, 8) : 'General'}
        </Badge>
        <AssessmentTimer
          totalSeconds={timeLimitSeconds}
          onExpire={handleSubmit}
        />
      </div>

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        Question {currentIndex + 1} of {totalQuestions}
      </p>

      {/* Progress */}
      <div className="mb-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
          animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQuestion?.id}
          custom={direction}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -30 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 bg-white p-6 shadow-md rounded-xl">
            <p className="mb-6 text-sm font-medium text-gray-900">
              {currentQuestion?.question_text}
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Baseline options">
              {options.map((opt, idx) => {
                const isSelected = currentAnswer === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={opt.option_text}
                    onClick={() => handleSelect(idx)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-gray-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-blue-500' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                    </span>
                    {opt.option_text}
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex w-full max-w-md items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="text-gray-500"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={saveResponses.isPending}
          className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {currentIndex === totalQuestions - 1
            ? saveResponses.isPending
              ? 'Submitting...'
              : 'Submit'
            : 'Next'}
        </Button>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────

export const BaselineTestStep = ({
  isDay1,
  onComplete,
  studentId,
  assessmentVersion,
  courseIds,
}: BaselineTestStepProps) => {
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0);

  // Day 1 mode skips baseline tests
  if (isDay1 || courseIds.length === 0) {
    return null;
  }

  const currentCourseId = courseIds[currentCourseIndex] ?? '';

  const handleCourseComplete = () => {
    if (currentCourseIndex < courseIds.length - 1) {
      setCurrentCourseIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {courseIds.length > 1 && (
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
          Course {currentCourseIndex + 1} of {courseIds.length}
        </p>
      )}
      <SingleCourseTest
        key={currentCourseId}
        courseId={currentCourseId}
        studentId={studentId}
        assessmentVersion={assessmentVersion}
        onComplete={handleCourseComplete}
      />
    </div>
  );
};

export default BaselineTestStep;
