import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Joyride, { type CallBackProps, STATUS } from "react-joyride";
import { useAuth } from "@/hooks/useAuth";
import { useGuidedTour } from "@/hooks/useGuidedTour";

/**
 * Guided tour wrapper using react-joyride.
 * Mounts in each role layout and auto-launches on first login if tourFeatureFlag is true.
 *
 * Design: ADR-02, §8.4
 * Requirements: 2.15
 *
 * @example
 * <GuidedTour />
 */
const GuidedTour = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const {
    steps,
    run,
    stepIndex,
    onCallback,
    shouldAutoStart,
    isCompleted,
    start,
  } = useGuidedTour(profile?.role ?? "student");

  // Track whether we've already auto-started this session
  const [autoStarted, setAutoStarted] = useState(false);

  // Auto-launch tour on first login if feature flag is enabled
  useEffect(() => {
    if (shouldAutoStart && !isCompleted && !autoStarted) {
      const timer = setTimeout(() => {
        start();
        setAutoStarted(true);
      }, 800); // Small delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [shouldAutoStart, isCompleted, autoStarted, start]);

  // Handle joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Map joyride callback to our hook's callback format
    onCallback({
      action,
      index,
      step: steps[index] ?? steps[0] ?? { target: "", content: "" },
      type,
      status: status as string,
    });

    // Stop tour on finish or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setAutoStarted(false);
    }
  };

  if (!steps.length || !run) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      spotlightClicks={false}
      styles={{
        options: {
          primaryColor: "#3b82f6",
          zIndex: 10000,
          arrowColor: "#ffffff",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          textColor: "#1e293b",
          width: 380,
        },
        buttonNext: {
          background: "var(--brand-gradient)",
          color: "#ffffff",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: "600",
        },
        buttonBack: {
          color: "#64748b",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: "13px",
        },
        tooltip: {
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        },
        tooltipTitle: {
          fontSize: "16px",
          fontWeight: "700",
          color: "#0f172a",
        },
        tooltipContent: {
          fontSize: "14px",
          color: "#475569",
          lineHeight: "1.6",
        },
        spotlight: {
          borderRadius: "8px",
        },
      }}
      locale={{
        back: t("tour.back", "Back"),
        close: t("tour.close", "Close"),
        last: t("tour.finish", "Finish"),
        next: t("tour.next", "Next"),
        open: t("tour.open", "Open the dialog"),
        skip: t("tour.skip", "Skip tour"),
      }}
    />
  );
};

export default GuidedTour;
