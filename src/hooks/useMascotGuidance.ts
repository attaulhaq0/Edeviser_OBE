// =============================================================================
// useMascotGuidance — resolves whether the mascot should coach at a moment (R35)
// =============================================================================
//
// Thin React binding over the pure `resolveMascotGuidance` logic. It reads the
// student's mascot-enabled preference (defaulting to enabled) and returns the
// resolved guidance descriptor for the requested moment, or `null` when the
// mascot is disabled or no moment is active — so consuming surfaces remain
// fully functional regardless of the guidance state (R35.4, R35.5).
//
// The preference is stored in localStorage (additive, no schema change): this
// keeps the optional enhancement self-contained and means the surrounding
// surfaces never depend on a network round-trip to render.

import { useMemo } from "react";
import {
  parseMascotEnabled,
  resolveMascotGuidance,
  type MascotGuidance,
  type MascotMomentId,
} from "@/lib/mascotGuidance";

const STORAGE_KEY = "edeviser-mascot-enabled";

/** Read the mascot-enabled preference, falling back to the default safely. */
export const isMascotGuidanceEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return parseMascotEnabled(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage can throw (privacy mode / quota). Degrade to the default.
    return true;
  }
};

/** Persist the mascot-enabled preference. */
export const setMascotGuidanceEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // No-op: an unwritable store simply keeps the in-memory default.
  }
};

/**
 * Resolve mascot guidance for a given key moment.
 *
 * @param moment - The active key moment, or `null` when no moment is active.
 * @returns The guidance descriptor to render, or `null` to render nothing.
 */
export const useMascotGuidance = (
  moment: MascotMomentId | null
): MascotGuidance | null => {
  const enabled = isMascotGuidanceEnabled();
  return useMemo(
    () => resolveMascotGuidance({ enabled, moment }),
    [enabled, moment]
  );
};
