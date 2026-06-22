import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGuidedTour } from "@/hooks/useGuidedTour";

// react-joyride lives entirely in TourRunner so it is code-split out of this
// always-mounted component (every role layout renders <GuidedTour />). The
// chunk is fetched only when a tour actually runs (Task 15.2 — load on first use).
const TourRunner = lazy(() => import("@/components/shared/TourRunner"));

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
  const { profile } = useAuth();
  const { steps, run, onCallback, shouldAutoStart, isCompleted, start } =
    useGuidedTour(profile?.role ?? "student");

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

  if (!steps.length || !run) {
    return null;
  }

  // Only mount the react-joyride surface (and fetch its chunk) once a tour is
  // actually running. Suspense fallback is null — the tour overlay simply
  // appears a tick later, with no layout placeholder needed.
  return (
    <Suspense fallback={null}>
      <TourRunner
        steps={steps}
        run={run}
        onCallback={onCallback}
        onFinishOrSkip={() => setAutoStarted(false)}
      />
    </Suspense>
  );
};

export default GuidedTour;
