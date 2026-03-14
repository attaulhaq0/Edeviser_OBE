import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUpdateProgress } from '@/hooks/useOnboardingProgress';
import { useProcessOnboarding } from '@/hooks/useStudentProfile';
import { DAY1_STEPS, ONBOARDING_STEPS } from '@/lib/onboardingConstants';
import type { OnboardingStepId } from '@/lib/onboardingConstants';
import { WelcomeStep } from './WelcomeStep';
import { PersonalityStep } from './PersonalityStep';
import { LearningStyleStep } from './LearningStyleStep';
import { SelfEfficacyStep } from './SelfEfficacyStep';
import { StudyStrategyStep } from './StudyStrategyStep';
import { BaselineSelectStep } from './BaselineSelectStep';
import { BaselineTestStep } from './BaselineTestStep';
import { ProfileSummaryStep } from './ProfileSummaryStep';

// ── Types ────────────────────────────────────────────────────────────

export interface WizardStepProps {
  isDay1: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  studentId: string;
  assessmentVersion: number;
}

interface OnboardingWizardProps {
  isDay1?: boolean;
}

// ── Skippable steps ──────────────────────────────────────────────────

const SKIPPABLE_STEPS: Set<OnboardingStepId> = new Set([
  'personality',
  'learning_style',
  'self_efficacy',
  'study_strategy',
  'baseline_select',
]);

// ── Component ────────────────────────────────────────────────────────

export const OnboardingWizard = ({ isDay1 = true }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const { data: progress, isLoading: progressLoading } = useOnboardingProgress(studentId);
  const updateProgress = useUpdateProgress(studentId);
  const processOnboarding = useProcessOnboarding();

  const steps = useMemo<readonly OnboardingStepId[]>(
    () => (isDay1 ? DAY1_STEPS : ONBOARDING_STEPS),
    [isDay1],
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skippedSections, setSkippedSections] = useState<string[]>([]);
  const [baselineCourseIds, setBaselineCourseIds] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Resume from last saved step
  useEffect(() => {
    if (!progress) return;
    const savedStep = progress.current_step;
    const idx = steps.indexOf(savedStep);
    if (idx > 0) setCurrentStepIndex(idx);
    if (progress.skipped_sections.length > 0) {
      setSkippedSections(progress.skipped_sections);
    }
    if (progress.baseline_course_ids.length > 0) {
      setBaselineCourseIds(progress.baseline_course_ids);
    }
  }, [progress, steps]);

  const currentStep = steps[currentStepIndex] as OnboardingStepId;
  const totalSteps = steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  const assessmentVersion = progress?.assessment_version ?? 1;

  // ── Navigation handlers ──────────────────────────────────────────

  const goNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setDirection(1);
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      updateProgress.mutate({
        current_step: steps[nextIndex],
      });
    }
  }, [currentStepIndex, totalSteps, steps, updateProgress]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    const stepName = currentStep;
    const sectionMap: Partial<Record<OnboardingStepId, string>> = {
      personality: 'personality',
      learning_style: 'learning_style',
      self_efficacy: 'self_efficacy',
      study_strategy: 'study_strategy',
      baseline_select: 'baseline',
    };
    const section = sectionMap[stepName];
    if (section) {
      setSkippedSections((prev) => {
        const next = [...prev, section];
        updateProgress.mutate({ skipped_sections: next });
        return next;
      });
    }
    goNext();
  }, [currentStep, goNext, updateProgress]);

  const handleStepComplete = useCallback(() => {
    const completionMap: Partial<Record<OnboardingStepId, Record<string, boolean>>> = {
      personality: { personality_completed: true },
      learning_style: { learning_style_completed: true },
      self_efficacy: { self_efficacy_completed: true },
      study_strategy: { study_strategy_completed: true },
      baseline_test: { baseline_completed: true },
    };
    const fields = completionMap[currentStep];
    if (fields) {
      updateProgress.mutate(fields);
    }
    goNext();
  }, [currentStep, goNext, updateProgress]);

  const handleBaselineCoursesSelected = useCallback(
    (courseIds: string[]) => {
      setBaselineCourseIds(courseIds);
      updateProgress.mutate({ baseline_course_ids: courseIds });
      if (courseIds.length === 0) {
        // Skip baseline test step
        setSkippedSections((prev) => {
          const next = [...prev, 'baseline'];
          updateProgress.mutate({ skipped_sections: next });
          return next;
        });
        // Jump past baseline_test to summary
        const summaryIdx = steps.indexOf('summary');
        if (summaryIdx >= 0) {
          setDirection(1);
          setCurrentStepIndex(summaryIdx);
          updateProgress.mutate({ current_step: 'summary' });
        }
      } else {
        goNext();
      }
    },
    [goNext, steps, updateProgress],
  );

  const handleConfirmProfile = useCallback(async () => {
    setIsProcessing(true);
    try {
      await processOnboarding.mutateAsync({
        student_id: studentId,
        assessment_version: assessmentVersion,
        skipped_sections: skippedSections as Array<
          'personality' | 'learning_style' | 'baseline' | 'self_efficacy' | 'study_strategy'
        >,
        baseline_course_ids: baselineCourseIds,
        is_day1: isDay1,
      });
      if (isDay1) {
        updateProgress.mutate({ day1_completed: true });
      }
      navigate('/student');
    } catch {
      // Error handled by mutation
    } finally {
      setIsProcessing(false);
    }
  }, [
    processOnboarding,
    studentId,
    assessmentVersion,
    skippedSections,
    baselineCourseIds,
    isDay1,
    navigate,
    updateProgress,
  ]);

  // ── Step renderer ────────────────────────────────────────────────

  const renderStep = () => {
    const stepProps: WizardStepProps = {
      isDay1,
      onComplete: handleStepComplete,
      onSkip: SKIPPABLE_STEPS.has(currentStep) ? handleSkip : undefined,
      studentId,
      assessmentVersion,
    };

    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;
      case 'personality':
        return <PersonalityStep {...stepProps} />;
      case 'learning_style':
        return <LearningStyleStep {...stepProps} />;
      case 'self_efficacy':
        return <SelfEfficacyStep {...stepProps} />;
      case 'study_strategy':
        return <StudyStrategyStep {...stepProps} />;
      case 'baseline_select':
        return (
          <BaselineSelectStep
            {...stepProps}
            onCoursesSelected={handleBaselineCoursesSelected}
          />
        );
      case 'baseline_test':
        return (
          <BaselineTestStep
            {...stepProps}
            courseIds={baselineCourseIds}
          />
        );
      case 'summary':
        return (
          <ProfileSummaryStep
            {...stepProps}
            onConfirm={handleConfirmProfile}
            isProcessing={isProcessing}
            skippedSections={skippedSections}
          />
        );
      default:
        return null;
    }
  };

  if (progressLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Progress bar */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span className="text-sm font-medium text-blue-600">{progressPercent}%</span>
        </div>
        <div className="mx-auto mt-2 max-w-2xl">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="border-t border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {SKIPPABLE_STEPS.has(currentStep) && (
              <Button variant="ghost" onClick={handleSkip} className="gap-1 text-gray-500">
                <SkipForward className="h-4 w-4" />
                Skip for Now
              </Button>
            )}

            {currentStep !== 'summary' && (
              <Button
                onClick={goNext}
                disabled={currentStepIndex >= totalSteps - 1}
                className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
