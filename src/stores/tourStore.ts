import { create } from "zustand";
import type { UserRole } from "@/types/app";
import type { AuthContextValue } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

/**
 * Tour store state and actions
 *
 * Manages the guided tour lifecycle:
 * - tourActive: whether a tour is currently running
 * - currentRoleTourId: which role's tour is active (null if none)
 * - tourFeatureFlag: global feature flag (defaults to false, flipped to true in Task 90)
 * - start(role): begin the tour for a specific role
 * - skip(): dismiss the current tour
 * - complete(role): mark the tour as completed for a role
 */
interface TourStore {
  tourActive: boolean;
  currentRoleTourId: UserRole | null;
  tourFeatureFlag: boolean;
  start: (role: UserRole) => void;
  skip: () => void;
  complete: (role: UserRole) => void;
  _setTourFeatureFlag: (flag: boolean) => void;
}

/**
 * Create the Zustand tour store
 *
 * Persistence strategy:
 * - tourFeatureFlag: localStorage (key: 'tour-feature-flag')
 * - Tour completion: profiles.tour_completed_at (synced via subscribe-to-authStore bridge)
 *
 * Feature flag lifecycle:
 * - Defaults to false throughout Phases 2, 3, 4 (so tour doesn't compete with design-system fixes)
 * - Flipped to true globally in Task 90 (Phase 5) after all surfaces adopt TopBar/WelcomeHero/EmptyState
 * - Once true, tour launches on first login per role (when profiles.tour_completed_at is null)
 */
export const useTourStore = create<TourStore>((set) => {
  // Initialize tourFeatureFlag from localStorage
  // Task 90: Default is now `true`. If a user previously stored `false`,
  // upgrade them to `true` on next hydrate (localStorage migration).
  const storedFeatureFlag = (() => {
    if (typeof localStorage === "undefined") return true;
    const stored = localStorage.getItem("tour-feature-flag");
    // If never set, or explicitly set to 'false' (pre-Task-90 default), upgrade to true
    if (stored === null || stored === "false") {
      localStorage.setItem("tour-feature-flag", "true");
      return true;
    }
    return stored === "true";
  })();

  return {
    tourActive: false,
    currentRoleTourId: null,
    tourFeatureFlag: storedFeatureFlag,

    start: (role: UserRole) => {
      set({ tourActive: true, currentRoleTourId: role });
    },

    skip: () => {
      set({ tourActive: false, currentRoleTourId: null });
    },

    complete: (_role: UserRole) => {
      set({ tourActive: false, currentRoleTourId: null });
      // Persist completion to database via the auth bridge
      // (see setupTourAuthBridge below)
    },

    _setTourFeatureFlag: (flag: boolean) => {
      set({ tourFeatureFlag: flag });
      // Persist to localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("tour-feature-flag", flag ? "true" : "false");
      }
    },
  };
});

/**
 * Bridge: subscribe to auth state and sync tour_completed_at to Supabase
 *
 * This function should be called once during app initialization (e.g., in a root effect)
 * to establish the bidirectional sync between the store and the database.
 *
 * Flow:
 * 1. When user authenticates, check if they have completed the tour (profiles.tour_completed_at)
 * 2. When user completes the tour, persist the timestamp to profiles.tour_completed_at
 * 3. When user signs out, reset tour state
 */
export const setupTourAuthBridge = (auth: AuthContextValue) => {
  // When auth state changes, check if tour is already completed
  if (auth.user && auth.profile) {
    // If tour_completed_at is set, the user has already completed the tour
    // The tour will not launch on subsequent logins
    if (auth.profile.tour_completed_at) {
      useTourStore.setState({ tourActive: false, currentRoleTourId: null });
    }
  }

  // Subscribe to tour completion and persist to Supabase when authenticated
  let previousTourActive = useTourStore.getState().tourActive;
  let previousRoleTourId = useTourStore.getState().currentRoleTourId;

  const unsubscribe = useTourStore.subscribe((state) => {
    // Detect when tour transitions from active to inactive (completion or skip)
    const tourJustCompleted =
      previousTourActive === true &&
      state.tourActive === false &&
      previousRoleTourId !== null;

    if (tourJustCompleted && auth.user) {
      previousTourActive = state.tourActive;
      previousRoleTourId = state.currentRoleTourId;

      // Fire-and-forget: persist tour completion to database
      (async () => {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ tour_completed_at: new Date().toISOString() })
            .eq("id", auth.user!.id);
          if (error) {
            console.error("Failed to persist tour completion:", error);
          }
        } catch (error) {
          console.error("Failed to persist tour completion:", error);
        }
      })();
    }

    previousTourActive = state.tourActive;
    previousRoleTourId = state.currentRoleTourId;
  });

  return unsubscribe;
};
