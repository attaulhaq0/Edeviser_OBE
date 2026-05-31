// =============================================================================
// useApproachableWording — younger-student wording with cross-language fallback
// =============================================================================
//
// The younger-student-friendly wording (R22) must display even when the active
// language lacks a key but the other supported language has it (R22.6). This
// hook returns a translator that applies that fallback policy via
// `resolveLocalizedOrFail`, and re-renders on language change (through
// `useTranslation`) so the wording stays correct after a runtime switch.

import { useTranslation } from "react-i18next";
import { resolveLocalizedOrFail } from "@/lib/localization";

export type ApproachableTranslator = (
  key: string,
  params?: Record<string, unknown>
) => string;

/**
 * Returns a translator for younger-student wording in the given namespace.
 *
 * The translator resolves the active language first and falls back to the other
 * supported language when only that one has the key (R22.6). If neither has it,
 * it returns the bare key so the UI never breaks.
 *
 * `useTranslation` subscribes the component to language changes, so the wording
 * re-resolves automatically on a runtime language switch.
 */
export function useApproachableWording(ns = "student"): ApproachableTranslator {
  useTranslation(ns);

  return (key: string, params?: Record<string, unknown>): string => {
    const resolved = resolveLocalizedOrFail(key, {
      ns,
      fallbackToOtherLang: true,
      params,
    });
    // Final guard: never render a broken value. Fall back to the bare key.
    return resolved ?? key;
  };
}
