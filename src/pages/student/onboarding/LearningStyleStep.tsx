import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGatedMotion } from "@/lib/motionGate";
import { Layers, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AssessmentIntro from "@/components/shared/AssessmentIntro";
import { useLearningStyleQuestions } from "@/hooks/useOnboardingQuestions";
import { useSaveResponses } from "@/hooks/useOnboardingResponses";
import { useAssessmentIntro } from "@/hooks/useAssessmentIntro";
import { shouldRenderAssessmentBody } from "@/lib/assessmentIntro";
import type { OnboardingQuestion } from "@/hooks/useOnboardingQuestions";
import type { WizardStepProps } from "./OnboardingWizard";

// ── Types ────────────────────────────────────────────────────────────

interface VARKOption {
  option_text: string;
  modality: string;
}

const parseOptions = (question: OnboardingQuestion): VARKOption[] => {
  if (!Array.isArray(question.options)) return [];
  return question.options as VARKOption[];
};

// ── Component ────────────────────────────────────────────────────────

export const LearningStyleStep = ({
  isDay1,
  onComplete,
  studentId,
  assessmentVersion,
}: WizardStepProps) => {
  const { t } = useTranslation("student");
  const introContent = useAssessmentIntro("learning_style");
  const motionGate = useGatedMotion();
  const { data: questions = [], isLoading } = useLearningStyleQuestions();
  const saveResponses = useSaveResponses();

  // R17.2a — gate the assessment body until the benefit + estimated-time
  // intro is shown and the student begins.
  const [hasBegun, setHasBegun] = useState(false);
  const handleBegin = useCallback(() => setHasBegun(true), []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;
  const options = currentQuestion ? parseOptions(currentQuestion) : [];

  const handleSelect = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleNext = async () => {
    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Save all responses
      const responses = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? 0,
      }));

      await saveResponses.mutateAsync({
        student_id: studentId,
        assessment_type: "learning_style",
        assessment_version: assessmentVersion,
        responses,
      });

      onComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Learning style is NOT shown in Day 1 mode — delivered via micro-assessments
  if (isDay1) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Layers className="mb-4 h-10 w-10 text-blue-400" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          {t("onboarding.learningStyle.day1.title")}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          {t("onboarding.learningStyle.day1.body")}
        </p>
        <Button
          onClick={onComplete}
          className="mt-6 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {t("onboarding.learningStyle.day1.continue")}
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
        {t("onboarding.learningStyle.noQuestions")}
      </div>
    );
  }

  // R17 — benefit-oriented framing gates the assessment body until the
  // benefit + estimated time are shown and the student begins (R17.2a).
  if (
    !shouldRenderAssessmentBody({
      hasBegun,
      benefits: introContent.benefits,
      estimatedTime: introContent.estimatedTime,
    })
  ) {
    return (
      <AssessmentIntro
        icon={Layers}
        content={introContent}
        beginLabel={t("onboarding.assessmentIntro.begin")}
        onBegin={handleBegin}
      />
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Layers className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          {t("onboarding.learningStyle.title")}
        </h2>
      </div>

      {/* Research disclaimer */}
      <Card className="mb-6 flex flex-row items-start gap-2 border-0 bg-amber-50 p-3 shadow-none">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800">
          {t("onboarding.learningStyle.disclaimer")}
        </p>
      </Card>

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        {t("onboarding.learningStyle.questionProgress", {
          current: currentIndex + 1,
          total: totalQuestions,
        })}
      </p>

      {/* Question progress */}
      <div className="mb-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
          animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          transition={motionGate.transition({ duration: 0.2 })}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQuestion?.id}
          custom={direction}
          initial={motionGate.enter(
            { opacity: 0, x: direction * 30 },
            { opacity: 1, x: 0 }
          )}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -30 }}
          transition={motionGate.transition({ duration: 0.2 })}
          className="w-full max-w-md"
        >
          <Card className="border-0 bg-white p-6 shadow-md rounded-xl">
            <p className="mb-6 text-sm font-medium text-gray-900">
              {currentQuestion?.question_text}
            </p>
            <div
              className="flex flex-col gap-2"
              role="radiogroup"
              aria-label={t("onboarding.learningStyle.scaleLabel")}
            >
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
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-start text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-gray-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-blue-500" : "border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
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
          {t("onboarding.learningStyle.previous")}
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentAnswer === null || saveResponses.isPending}
          className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {currentIndex === totalQuestions - 1
            ? saveResponses.isPending
              ? t("onboarding.learningStyle.saving")
              : t("onboarding.learningStyle.complete")
            : t("onboarding.learningStyle.next")}
        </Button>
      </div>
    </div>
  );
};

export default LearningStyleStep;
