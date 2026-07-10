// =============================================================================
// useFeatureFlag — reactive read of a UI-migration feature flag
// =============================================================================
//
// Subscribes to cross-tab (`storage`) and in-tab (`FEATURE_FLAG_EVENT`) changes
// so flipping an override at runtime (e.g. via `setFeatureOverride` in dev)
// re-renders consumers immediately — enabling instant, redeploy-free review /
// rollback of new-UI modules (R13.2). See `@/lib/featureFlags`.
// =============================================================================

import { useSyncExternalStore } from "react";

import {
  isFeatureEnabled,
  FEATURE_FLAG_EVENT,
  type FeatureFlag,
} from "@/lib/featureFlags";

const subscribe = (onChange: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(FEATURE_FLAG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FEATURE_FLAG_EVENT, onChange);
  };
};

/** Reactively read whether a feature flag is enabled. */
export const useFeatureFlag = (flag: FeatureFlag): boolean =>
  useSyncExternalStore(
    subscribe,
    () => isFeatureEnabled(flag),
    () => false // SSR/prerender snapshot — default to old UI
  );
