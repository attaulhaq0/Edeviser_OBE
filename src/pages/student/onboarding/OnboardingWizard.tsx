import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useGatedMotion } from "@/lib/motionGate";
import { ChevronLeft, ChevronRight, SkipForward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useOnboardingProgress,
  useUpdateProgress,
} from "@/hooks/useOnboardingProgress";
import type { UpdateProgressInput } from "@/hooks/useOnboardingProgress";
import { useProcessOnboarding } from "@/hooks/useStudentProfile";
import { DAY1_STEPS, ONBOARDING_STEPS } from "@/lib/onboardingConstants";
import type { OnboardingStepId } from "@/lib/onboardingConstants";
import { WelcomeStep } from "./WelcomeStep";
import { PersonalityStep } from "./PersonalityStep";
import { LearningStyleStep } from "./LearningStyleStep";
import { SelfEfficacyStep } from "./SelfEfficacyStep";
import { StudyStrategyStep } from "./StudyStrategyStep";
import { BaselineSelectStep } from "./BaselineSelectStep";
import { BaselineTestStep } from "./BaselineTestStep";
import { ProfileSummaryStep } from "./ProfileSummaryStep";

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
  "personality",
  "learning_style",
  "self_efficacy",
  "study_strategy",
  "baseline_select",
]);

// ── Component ────────────────────────────────────────────────────────

export const OnboardingWizard = ({
  isDay1: isDay1Prop,
}: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("student");
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refetchProfile } = useAuth();
  const studentId = user?.id ?? "";

  const { data: progress, isLoading: progressLoading } =
    useOnboardingProgress(studentId);
  const updateProgress = useUpdateProgress(studentId);
  const processOnboarding = useProcessOnboarding();
  const motionGate = useGatedMotion();

  // ── First-time-login detection (clause 2.14) ──────────────────────
  // A student is on their first login if:
  // - current_step === 'welcome' AND
  // - all completion flags are false
  const isFirstTimeLogin = useMemo(() => {
    if (!progress) return true; // Default to first-time if no progress yet
    return (
      progress.current_step === "welcome" &&
      !progress.personality_completed &&
      !progress.learning_style_completed &&
      !progress.self_efficacy_completed &&
      !progress.study_strategy_completed &&
      !progress.baseline_completed &&
      !progress.day1_completed
    );
  }, [progress]);

  // Determine if this is Day 1 phase based on first-time-login detection
  const isDay1: boolean = isFirstTimeLogin ? true : isDay1Prop ?? false;

  const steps = useMemo<readonly OnboardingStepId[]>(
    () => (isDay1 ? DAY1_STEPS : ONBOARDING_STEPS),
    [isDay1]
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skippedSections, setSkippedSections] = useState<string[]>([]);
  const [baselineCourseIds, setBaselineCourseIds] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Resume from last saved step (only if not first-time login)
  useEffect(() => {
    if (!progress) return;

    // For first-time login, always start at step 0 (welcome)
    if (isFirstTimeLogin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset to welcome on first-time login
      setCurrentStepIndex(0);
      return;
    }

    // For resuming users, load from saved progress
    const savedStep = progress.current_step;
    const idx = steps.indexOf(savedStep);
    if (idx >= 0) setCurrentStepIndex(idx);
    if (progress.skipped_sections.length > 0) {
      setSkippedSections(progress.skipped_sections);
    }
    if (progress.baseline_course_ids.length > 0) {
      setBaselineCourseIds(progress.baseline_course_ids);
    }
  }, [progress, steps, isFirstTimeLogin]);

  // Jump to specific step when ?step=<id> is provided in the URL.
  // This lets CompleteProfilePage link directly to a dimension's step
  // (e.g. /student/onboarding?step=personality).
  const stepParam = searchParams.get("step") as OnboardingStepId | null;
  useEffect(() => {
    // Do not consume the deep link until persisted progress is available.
    // Otherwise the URL step is applied first and then overwritten when the
    // asynchronous resume effect resolves (observed on direct route loads).
    if (!stepParam || !progress) return;
    const idx = steps.indexOf(stepParam);
    if (idx >= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: jump-to-step from URL param
      setCurrentStepIndex(idx);
      // Clear the param so refresh / back-nav don't reapply it.
      const next = new URLSearchParams(searchParams);
      next.delete("step");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on initial param resolution
  }, [stepParam, steps, progress]);

  const currentStep = steps[currentStepIndex] as OnboardingStepId;
  const totalSteps = steps.length;
  const progressPercent = Math.round(
    ((currentStepIndex + 1) / totalSteps) * 100
  );
  const assessmentVersion: number = progress?.assessment_version ?? 1;

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
      personality: "personality",
      learning_style: "learning_style",
      self_efficacy: "self_efficacy",
      study_strategy: "study_strategy",
      baseline_select: "baseline",
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
    const completionMap: Partial<
      Record<OnboardingStepId, Record<string, boolean>>
    > = {
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
          const next = [...prev, "baseline"];
          updateProgress.mutate({ skipped_sections: next });
          return next;
        });
        // Jump past baseline_test to summary
        const summaryIdx = steps.indexOf("summary");
        if (summaryIdx >= 0) {
          setDirection(1);
          setCurrentStepIndex(summaryIdx);
          updateProgress.mutate({ current_step: "summary" });
        }
      } else {
        goNext();
      }
    },
    [goNext, steps, updateProgress]
  );

  const handleConfirmProfile = useCallback(async () => {
    setIsProcessing(true);
    try {
      // ── 2-Phase Completion Logic (clause 2.20) ──────────────────────
      // Phase 1 (Day 1): complete DAY1_STEPS, set day1_completed=true
      // Phase 2 (Later): complete remaining ONBOARDING_STEPS, set onboarding_completed=true
      // The process_onboarding Edge Function handles updating profiles.onboarding_completed

      await processOnboarding.mutateAsync({
        student_id: studentId,
        assessment_version: assessmentVersion,
        skipped_sections: skippedSections as Array<
          | "personality"
          | "learning_style"
          | "baseline"
          | "self_efficacy"
          | "study_strategy"
        >,
        baseline_course_ids: baselineCourseIds,
        is_day1: isDay1,
      });

      // Update progress with completion flags
      const completionData = {
        personality_completed: true as const,
        learning_style_completed: true as const,
        self_efficacy_completed: true as const,
        study_strategy_completed: true as const,
        baseline_completed: true as const,
      };
      if (isDay1) {
        (completionData as UpdateProgressInput).day1_completed = true;
      }
      updateProgress.mutate(completionData as UpdateProgressInput);

      // Refresh the AuthProvider's profile so `onboarding_completed` flips to
      // true and StudentLayout removes the wizard overlay immediately.
      await refetchProfile();
    } catch (err) {
      // Never silently swallow (engineering-guardrails): surface the failure so
      // it is visible in the console and picked up by error monitoring. The
      // Edge Function call is intentionally de-coupled from navigation — the
      // `finally` block below still routes the student to their dashboard, so a
      // slow / erroring / unavailable process-onboarding function can never
      // trap them on the full-screen "Processing…" overlay (Req 2).
      console.error(
        "[OnboardingWizard] process-onboarding failed; continuing to dashboard",
        err
      );
      // Even on failure, refresh the profile — the Edge Function may have
      // partially succeeded and set onboarding_completed on the server.
      await refetchProfile().catch(() => {});
    } finally {
      setIsProcessing(false);
      // Optimistic navigation (clause 2.20: respond within 200ms) — always
      // leave the wizard for the dashboard, regardless of Edge Function outcome.
      navigate("/student");
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
    refetchProfile,
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
      case "welcome":
        return <WelcomeStep {...stepProps} />;
      case "personality":
        return <PersonalityStep {...stepProps} />;
      case "learning_style":
        return <LearningStyleStep {...stepProps} />;
      case "self_efficacy":
        return <SelfEfficacyStep {...stepProps} />;
      case "study_strategy":
        return <StudyStrategyStep {...stepProps} />;
      case "baseline_select":
        return (
          <BaselineSelectStep
            {...stepProps}
            onCoursesSelected={handleBaselineCoursesSelected}
          />
        );
      case "baseline_test":
        return (
          <BaselineTestStep {...stepProps} courseIds={baselineCourseIds} />
        );
      case "summary":
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
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-white"
        role="status"
        aria-label={t("onboarding.shell.loading")}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#0382bd]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[linear-gradient(145deg,#f0fdfa_0%,#eff6ff_52%,#eef2ff_100%)]">
      {/* Doodle pattern overlay — same asset used on /login for brand consistency */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: "url('/doodle-background.jpg')",
          backgroundSize: "1200px",
          backgroundRepeat: "repeat",
        }}
        aria-hidden="true"
      />

      {/* Floating gamified accent shapes */}
      <div
        className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-gradient-to-br from-teal-200/40 to-blue-300/40 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -start-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200/40 to-teal-200/40 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Progress bar */}
      <div className="relative border-b border-white/70 bg-white/72 px-5 py-3.5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500 sm:text-sm sm:normal-case sm:tracking-normal">
            {t("onboarding.shell.stepOf", {
              current: currentStepIndex + 1,
              total: totalSteps,
            })}
          </span>
          <span className="text-sm font-bold text-[#0382bd]">
            {progressPercent}%
          </span>
        </div>
        <div className="mx-auto mt-2 max-w-[680px]">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={t("onboarding.shell.progressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)]"
              initial={motionGate.enter(
                { width: 0 },
                { width: `${progressPercent}%` }
              )}
              animate={{ width: `${progressPercent}%` }}
              transition={motionGate.transition({
                duration: 0.3,
                ease: "easeOut",
              })}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto max-w-[680px] px-5 py-7 sm:px-6 sm:py-9">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={motionGate.enter(
                { opacity: 0, x: direction * 40 },
                { opacity: 1, x: 0 }
              )}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={motionGate.transition({ duration: 0.2 })}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* The welcome screen owns its prototype CTA; avoid duplicating it in
          the shell footer. Assessment steps retain Back/Skip/Next controls. */}
      {currentStep !== "welcome" && (
        <div className="relative border-t border-white/70 bg-white/72 px-5 py-3.5 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-[680px] items-center justify-between">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentStepIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("onboarding.shell.back")}
            </Button>

            <div className="flex items-center gap-2">
              {SKIPPABLE_STEPS.has(currentStep) && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="gap-1 text-gray-500"
                >
                  <SkipForward className="h-4 w-4" />
                  {t("onboarding.shell.skip")}
                </Button>
              )}

              {currentStep !== "summary" && (
                <Button
                  onClick={goNext}
                  disabled={currentStepIndex >= totalSteps - 1}
                  variant="tactile"
                  className="gap-1"
                >
                  {t("onboarding.shell.next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;
