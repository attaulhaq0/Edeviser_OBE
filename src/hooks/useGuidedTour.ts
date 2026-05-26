import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTourStore } from "@/stores/tourStore";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/app";
import { adminTourSteps } from "@/lib/tours/adminTour";
import { coordinatorTourSteps } from "@/lib/tours/coordinatorTour";
import { teacherTourSteps } from "@/lib/tours/teacherTour";
import { studentTourSteps } from "@/lib/tours/studentTour";
import { parentTourSteps } from "@/lib/tours/parentTour";
import type { Step } from "react-joyride";

/**
 * Tour step configuration (compatible with react-joyride)
 */
export interface TourStep extends Step {
  target: string; // CSS selector or data-tour attribute
  content: string;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  disableBeacon?: boolean;
}

/**
 * Return type for useGuidedTour
 */
interface UseGuidedTourReturn {
  /** Array of tour steps for the current role */
  steps: TourStep[];
  /** Whether the tour is currently active */
  run: boolean;
  /** Current step index */
  stepIndex: number;
  /** Callback for tour events (step change, finish, etc.) */
  onCallback: (data: TourCallbackData) => void;
  /** Start the tour */
  startTour: () => void;
  /** Skip/dismiss the tour */
  skipTour: () => void;
  /** Complete the tour */
  completeTour: () => void;
  /** Whether the tour should auto-start on first login */
  shouldAutoStart: boolean;
  /** Whether the tour has been completed */
  isCompleted: boolean;
  /** Start the tour (alias for startTour) */
  start: () => void;
}

/**
 * Callback data from react-joyride
 */
interface TourCallbackData {
  action: string;
  index: number;
  step: TourStep;
  type: string;
  status?: string;
}

/**
 * Map of role to tour steps
 */
const getTourStepsForRole = (role: UserRole): TourStep[] => {
  switch (role) {
    case "admin":
      return adminTourSteps as TourStep[];
    case "coordinator":
      return coordinatorTourSteps as TourStep[];
    case "teacher":
      return teacherTourSteps as TourStep[];
    case "student":
      return studentTourSteps as TourStep[];
    case "parent":
      return parentTourSteps as TourStep[];
    default:
      return [];
  }
};

/**
 * Hook for managing the guided tour
 *
 * Wraps react-joyride and tourStore to provide a simple interface for tour management.
 *
 * Features:
 * - Reads role from AuthProvider
 * - Selects appropriate tour steps for the role
 * - Manages tour state (active, step index)
 * - Persists tour completion to profiles.tour_completed_at
 * - Respects prefers-reduced-motion
 *
 * Usage:
 * ```tsx
 * const { steps, run, stepIndex, onCallback, startTour, skipTour, completeTour } = useGuidedTour();
 *
 * return (
 *   <>
 *     <Joyride
 *       steps={steps}
 *       run={run}
 *       stepIndex={stepIndex}
 *       callback={onCallback}
 *       continuous
 *       showSkipButton
 *     />
 *     <button onClick={startTour}>Start Tour</button>
 *   </>
 * );
 * ```
 */
export const useGuidedTour = (roleOverride?: UserRole): UseGuidedTourReturn => {
  const { t } = useTranslation("common");
  const { user, profile } = useAuth();
  const tourActive = useTourStore((state) => state.tourActive);
  const tourFeatureFlag = useTourStore((state) => state.tourFeatureFlag);
  const startTourAction = useTourStore((state) => state.start);
  const skipTourAction = useTourStore((state) => state.skip);
  const completeTourAction = useTourStore((state) => state.complete);

  // Get the user's role (use override if provided, otherwise use profile role)
  const userRole = (roleOverride || profile?.role) as UserRole | undefined;

  // Get tour steps for the current role and translate the i18n keys.
  // The raw step objects in src/lib/tours/*.ts store i18n keys (e.g.
  // "tour.student.step1.title") so we look them up here against common.json.
  // If a key is missing, t() returns the key itself, which is what was
  // showing in the UI before this fix.
  const steps = useMemo(() => {
    if (!userRole || !tourFeatureFlag) return [];
    const rawSteps = getTourStepsForRole(userRole);
    return rawSteps.map((step) => ({
      ...step,
      content:
        typeof step.content === "string"
          ? t(step.content, { defaultValue: step.content })
          : step.content,
      title:
        typeof step.title === "string"
          ? t(step.title, { defaultValue: step.title })
          : step.title,
    }));
  }, [userRole, tourFeatureFlag, t]);

  // Determine if tour should run
  // Tour runs if:
  // 1. Feature flag is enabled
  // 2. Tour is active in the store
  // 3. User has not completed the tour (tour_completed_at is null)
  const shouldRun: boolean = useMemo(() => {
    return (tourFeatureFlag &&
      tourActive &&
      user &&
      profile &&
      !profile.tour_completed_at) as boolean;
  }, [tourFeatureFlag, tourActive, user, profile]);

  // Determine if tour should auto-start
  const shouldAutoStart: boolean = useMemo(() => {
    return (tourFeatureFlag &&
      user &&
      profile &&
      !profile.tour_completed_at) as boolean;
  }, [tourFeatureFlag, user, profile]);

  // Determine if tour has been completed
  const isCompleted: boolean = useMemo(() => {
    return (
      profile?.tour_completed_at !== null &&
      profile?.tour_completed_at !== undefined
    );
  }, [profile?.tour_completed_at]);

  // Handle tour callbacks (step change, finish, etc.)
  const onCallback = useCallback(
    (data: TourCallbackData) => {
      const { action, status } = data;

      // Handle tour completion
      if (status === "finished" || action === "close") {
        if (userRole) {
          completeTourAction(userRole);
        }
      }

      // Handle tour skip
      if (action === "skip") {
        skipTourAction();
      }
    },
    [userRole, completeTourAction, skipTourAction]
  );

  // Start the tour
  const startTour = useCallback(() => {
    if (userRole && tourFeatureFlag) {
      startTourAction(userRole);
    }
  }, [userRole, tourFeatureFlag, startTourAction]);

  // Alias for startTour
  const start = startTour;

  // Skip the tour
  const skipTour = useCallback(() => {
    skipTourAction();
  }, [skipTourAction]);

  // Complete the tour
  const completeTour = useCallback(() => {
    if (userRole) {
      completeTourAction(userRole);
    }
  }, [userRole, completeTourAction]);

  return {
    steps,
    run: shouldRun,
    stepIndex: 0, // Will be managed by react-joyride
    onCallback,
    startTour,
    skipTour,
    completeTour,
    shouldAutoStart,
    isCompleted,
    start,
  };
};

/**
 * Helper to suppress Radix Dialog/Sheet/Popover onInteractOutside while tour is active
 *
 * Usage:
 * ```tsx
 * const { tourActive } = useTourStore();
 *
 * <Dialog modal={!tourActive} onOpenChange={...}>
 *   ...
 * </Dialog>
 * ```
 */
export const withTourAwareModal = (tourActive: boolean) => {
  return !tourActive; // Return modal state (true = modal, false = non-modal)
};
