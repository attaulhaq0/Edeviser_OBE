// =============================================================================
// TourRunner — the react-joyride render surface (Task 15.2, heavy-dep hygiene)
// =============================================================================
//
// All `react-joyride` runtime usage (the <Joyride> component, CallBackProps,
// STATUS) lives here so it can be code-split away from the always-mounted
// GuidedTour. GuidedTour lazy-loads this component only when a tour actually
// runs, so react-joyride is fetched on first tour use rather than on every
// authenticated page load.

import { useTranslation } from "react-i18next";
import Joyride, { type CallBackProps, STATUS } from "react-joyride";
import type { TourStep, TourCallbackData } from "@/hooks/useGuidedTour";

interface TourRunnerProps {
  steps: TourStep[];
  run: boolean;
  /** Forwarded to the useGuidedTour callback (completion/skip persistence). */
  onCallback: (data: TourCallbackData) => void;
  /** Invoked when the tour reaches a terminal (finished/skipped) state. */
  onFinishOrSkip: () => void;
}

const TourRunner = ({
  steps,
  run,
  onCallback,
  onFinishOrSkip,
}: TourRunnerProps) => {
  const { t } = useTranslation("common");

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
      onFinishOrSkip();
    }
  };

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

export default TourRunner;
