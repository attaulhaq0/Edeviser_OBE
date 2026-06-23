import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGatedMotion } from "@/lib/motionGate";
import { Shield, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AssessmentIntro from "@/components/shared/AssessmentIntro";
import { useSelfEfficacyQuestions } from "@/hooks/useOnboardingQuestions";
import { useSaveResponses } from "@/hooks/useOnboardingResponses";
import { useAssessmentIntro } from "@/hooks/useAssessmentIntro";
import { shouldRenderAssessmentBody } from "@/lib/assessmentIntro";
import { DAY1_SELF_EFFICACY_COUNT } from "@/lib/onboardingConstants";
import type { OnboardingQuestion } from "@/hooks/useOnboardingQuestions";
import type { WizardStepProps } from "./OnboardingWizard";

// ── Likert scale labels for self-efficacy ────────────────────────────

const EFFICACY_LABELS = [
  "Not at all confident",
  "Slightly confident",
  "Moderately confident",
  "Very confident",
  "Extremely confident",
] as const;

// ── Inline LikertScale (shared component created in Task 6) ─────────

interface LikertScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  questionId: string;
  labels?: readonly string[];
}

const LikertScale = ({
  value,
  onChange,
  questionId,
  labels = EFFICACY_LABELS,
}: LikertScaleProps) => (
  <div
    className="flex flex-col gap-2"
    role="radiogroup"
    aria-label="Self-efficacy scale"
  >
    {labels.map((label, idx) => {
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
          {label}
        </button>
      );
    })}
  </div>
);

// ── Helper: pick Day 1 subset ────────────────────────────────────────

const DAY1_DOMAINS = [
  "general_academic",
  "self_regulated_learning",
  "course_specific",
];

const pickDay1Questions = (
  questions: OnboardingQuestion[]
): OnboardingQuestion[] => {
  const picked: OnboardingQuestion[] = [];
  for (const domain of DAY1_DOMAINS) {
    const q = questions.find((q) => q.dimension === domain);
    if (q) picked.push(q);
  }
  return picked.slice(0, DAY1_SELF_EFFICACY_COUNT);
};

// ── Fallback panel ───────────────────────────────────────────────────
// Shared, non-alarming fallback used for both the genuine zero-data case
// (no questions seeded for this institution) and the distinct system-issue
// case (the questions query failed). In both cases the student is never
// blocked: an explicit Continue advances the onboarding sequence.

interface FallbackPanelProps {
  title: string;
  body: string;
  continueLabel: string;
  onContinue: () => void;
}

const FallbackPanel = ({
  title,
  body,
  continueLabel,
  onContinue,
}: FallbackPanelProps) => (
  <div className="flex flex-col items-center py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
      <Info className="h-6 w-6 text-blue-600" />
    </div>
    <h2 className="mb-2 text-lg font-bold tracking-tight text-gray-900">
      {title}
    </h2>
    <p className="mb-6 max-w-md text-sm text-gray-500">{body}</p>
    <Button
      onClick={onContinue}
      className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
    >
      {continueLabel}
    </Button>
  </div>
);

// ── Component ────────────────────────────────────────────────────────

export const SelfEfficacyStep = ({
  isDay1,
  onComplete,
  studentId,
  assessmentVersion,
}: WizardStepProps) => {
  const { t } = useTranslation("student");
  const introContent = useAssessmentIntro("self_efficacy");
  const motionGate = useGatedMotion();
  const {
    data: allQuestions = [],
    isLoading,
    isError,
  } = useSelfEfficacyQuestions();
  const saveResponses = useSaveResponses();

  // R17.2a — the assessment body stays gated until the student begins, which
  // is only possible after the benefit + estimated-time intro is displayed.
  const [hasBegun, setHasBegun] = useState(false);
  const handleBegin = useCallback(() => setHasBegun(true), []);

  const questions = useMemo(() => {
    if (allQuestions.length === 0) return [];
    if (!isDay1) return allQuestions;
    // Day-1 short path: present the focused subset, but never collapse to an
    // empty assessment when the institution genuinely has questions.
    const day1 = pickDay1Questions(allQuestions);
    return day1.length > 0 ? day1 : allQuestions;
  }, [isDay1, allQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;

  const handleSelect = useCallback(
    (value: number) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    },
    [currentQuestion]
  );

  const handleNext = useCallback(async () => {
    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Save all responses
      const responses = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? 3,
      }));

      await saveResponses.mutateAsync({
        student_id: studentId,
        assessment_type: "self_efficacy",
        assessment_version: assessmentVersion,
        responses,
      });

      onComplete();
    }
  }, [
    currentIndex,
    totalQuestions,
    questions,
    answers,
    saveResponses,
    studentId,
    assessmentVersion,
    onComplete,
  ]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // System issue: a query error means questions may exist but could not be
  // loaded. Surface this distinctly from the genuine zero-data case and never
  // show the "no questions" copy here (R11.4a, R11.4b). The student is never
  // blocked — an explicit Continue advances the onboarding sequence.
  if (isError) {
    return (
      <FallbackPanel
        title={t("onboarding.fallback.systemIssueTitle")}
        body={t("onboarding.fallback.systemIssueBody")}
        continueLabel={t("onboarding.fallback.continue")}
        onContinue={onComplete}
      />
    );
  }

  // Genuine zero-data: the query succeeded but the institution has no
  // self-efficacy questions seeded. Show a non-alarming fallback (never an
  // admin-contact error) and allow the student to continue (R11.3, R11.4).
  if (totalQuestions === 0) {
    return (
      <FallbackPanel
        title={t("onboarding.fallback.noQuestionsTitle")}
        body={t("onboarding.fallback.noQuestionsBody")}
        continueLabel={t("onboarding.fallback.continue")}
        onContinue={onComplete}
      />
    );
  }

  // R17 — benefit-oriented framing. The assessment body is gated until the
  // student has seen the benefits + estimated time and chosen to begin (R17.2a).
  if (
    !shouldRenderAssessmentBody({
      hasBegun,
      benefits: introContent.benefits,
      estimatedTime: introContent.estimatedTime,
    })
  ) {
    return (
      <AssessmentIntro
        icon={Shield}
        content={introContent}
        beginLabel={t("onboarding.assessmentIntro.begin")}
        onBegin={handleBegin}
      />
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          {t("onboarding.selfEfficacy.title")}
        </h2>
      </div>

      <p className="mb-1 max-w-md text-center text-xs text-gray-500">
        {t("onboarding.selfEfficacy.instructions")}
      </p>

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        {t("onboarding.selfEfficacy.questionProgress", {
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
            <LikertScale
              value={currentAnswer}
              onChange={handleSelect}
              questionId={currentQuestion?.id ?? ""}
            />
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
          {t("onboarding.selfEfficacy.previous")}
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentAnswer === null || saveResponses.isPending}
          className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {currentIndex === totalQuestions - 1
            ? saveResponses.isPending
              ? t("onboarding.selfEfficacy.saving")
              : t("onboarding.selfEfficacy.complete")
            : t("onboarding.selfEfficacy.next")}
        </Button>
      </div>
    </div>
  );
};

export default SelfEfficacyStep;
