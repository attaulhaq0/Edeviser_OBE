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

  // We intentionally do NOT pass stepIndex here. The hook returns 0 as a
  // placeholder, but passing it makes Joyride a controlled component that
  // never advances on Next clicks. Letting Joyride manage stepIndex
  // internally (uncontrolled) is what makes navigation work.
  return (
    <Joyride
      steps={steps}
      run={run}
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
          overlayColor: "rgba(15, 23, 42, 0.6)",
          textColor: "#1e293b",
          width: 400,
        },
        buttonNext: {
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          color: "#ffffff",
          borderRadius: "10px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: "600",
          border: "none",
          boxShadow: "0 2px 8px rgba(20, 184, 166, 0.3)",
          transition: "transform 100ms",
        },
        buttonBack: {
          color: "#64748b",
          marginInlineEnd: "8px",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: "13px",
          fontWeight: "500",
        },
        buttonClose: {
          width: "16px",
          height: "16px",
          color: "#94a3b8",
        },
        tooltip: {
          borderRadius: "16px",
          boxShadow:
            "0 20px 50px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          padding: "24px",
        },
        tooltipContainer: {
          textAlign: "start",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: "8px",
          letterSpacing: "-0.01em",
        },
        tooltipContent: {
          fontSize: "14px",
          color: "#475569",
          lineHeight: "1.6",
          padding: "8px 0 16px 0",
        },
        tooltipFooter: {
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #e2e8f0",
        },
        spotlight: {
          borderRadius: "12px",
          boxShadow:
            "0 0 0 4px rgba(59, 130, 246, 0.15), 0 0 0 8px rgba(59, 130, 246, 0.08)",
        },
        beacon: {
          // Hide default beacon — we use auto-launch
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
