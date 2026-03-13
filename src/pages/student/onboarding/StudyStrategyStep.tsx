import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStudyStrategyQuestions } from '@/hooks/useOnboardingQuestions';
import { useSaveResponses } from '@/hooks/useOnboardingResponses';
import type { WizardStepProps } from './OnboardingWizard';

const STRATEGY_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] as const;

const DIMENSION_LABELS: Record<string, string> = {
  time_management: 'Time Management',
  elaboration: 'Elaboration',
  self_testing: 'Self-Testing',
  help_seeking: 'Help-Seeking',
};

interface LikertScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  questionId: string;
}

const LikertScale = ({ value, onChange, questionId }: LikertScaleProps) => (
  <div className="flex flex-col gap-2" role="radiogroup" aria-label="Study strategy scale">
    {STRATEGY_LABELS.map((label, idx) => {
      const optionValue = idx + 1;
      const isSelected = value === optionValue;
      return (
        <button
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={label}
          id={`${questionId}-option-${optionValue}`}
          onClick={() => onChange(optionValue)}
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
          {label}
        </button>
      );
    })}
  </div>
);

export const StudyStrategyStep = ({
  isDay1,
  onComplete,
  studentId,
  assessmentVersion,
}: WizardStepProps) => {
  const { data: questions = [], isLoading } = useStudyStrategyQuestions();
  const saveResponses = useSaveResponses();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;

  const currentDimension = currentQuestion?.dimension
    ? DIMENSION_LABELS[currentQuestion.dimension] ?? currentQuestion.dimension
    : '';

  const handleSelect = useCallback(
    (value: number) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    },
    [currentQuestion],
  );

  const handleNext = useCallback(async () => {
    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      const responses = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? 3,
      }));

      await saveResponses.mutateAsync({
        student_id: studentId,
        assessment_type: 'study_strategy',
        assessment_version: assessmentVersion,
        responses,
      });

      onComplete();
    }
  }, [currentIndex, totalQuestions, questions, answers, saveResponses, studentId, assessmentVersion, onComplete]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Study strategy is NOT shown in Day 1 mode — delivered via micro-assessments
  if (isDay1) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <BookOpen className="mb-4 h-10 w-10 text-blue-400" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Study Strategy Inventory
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          This assessment will be delivered as short daily micro-assessments during your first two
          weeks. You&apos;ll earn XP for each one!
        </p>
        <Button
          onClick={onComplete}
          className="mt-6 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        No study strategy questions available. Please contact your administrator.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Study Strategy Inventory
        </h2>
      </div>

      <p className="mb-1 max-w-md text-center text-xs text-gray-500">
        Rate how often you use each study strategy.
      </p>

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        {currentDimension} — Question {currentIndex + 1} of {totalQuestions}
      </p>

      <div className="mb-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
          animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

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
            <LikertScale
              value={currentAnswer}
              onChange={handleSelect}
              questionId={currentQuestion?.id ?? ''}
            />
          </Card>
        </motion.div>
      </AnimatePresence>

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
          disabled={currentAnswer === null || saveResponses.isPending}
          className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {currentIndex === totalQuestions - 1
            ? saveResponses.isPending
              ? 'Saving...'
              : 'Complete'
            : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default StudyStrategyStep;
