// =============================================================================
// localization — runtime localization-policy helper
// =============================================================================
//
// `resolveLocalizedOrFail` centralizes how a surface resolves an i18n key when
// the active language may not have it. Surfaces declare their policy explicitly
// instead of relying on i18next's single global `fallbackLng` chain.
//
// The younger-student wording (R22) opts into cross-language fallback: when a
// Student selects English at runtime but only the Arabic localization resolves,
// the wording falls back to the available language rather than failing to
// display (R22.6). Build-time presence validation (R22.5) guarantees both
// localizations normally exist, so the runtime fallback is an edge case.

import i18n, { supportedLanguages } from "@/lib/i18n";

export interface ResolveLocalizedOptions {
  /**
   * When the active language lacks the key, fall back to the other supported
   * language before giving up (R22.6).
   */
  fallbackToOtherLang?: boolean;
  /** i18next namespace the key belongs to. Defaults to the configured default. */
  ns?: string;
  /** Interpolation values passed through to i18next. */
  params?: Record<string, unknown>;
}

/**
 * Resolves an i18n key with an explicit cross-language fallback policy.
 *
 * Returns the resolved, interpolated string, or `null` when the key cannot be
 * resolved in any supported language — letting callers decide how to surface
 * the gap rather than silently rendering the raw key.
 */
export function resolveLocalizedOrFail(
  key: string,
  options: ResolveLocalizedOptions = {}
): string | null {
  const { fallbackToOtherLang = false, ns, params } = options;
  const baseOptions: Record<string, unknown> = {
    ...(ns ? { ns } : {}),
    ...(params ?? {}),
  };

  // 1) Active language (honoring i18next's own fallback chain).
  if (i18n.exists(key, baseOptions)) {
    return asString(i18n.t(key, baseOptions));
  }

  // 2) Explicit fallback to the other supported language (R22.6).
  if (fallbackToOtherLang) {
    const active = (i18n.language ?? "").split("-")[0];
    for (const lng of supportedLanguages) {
      if (lng === active) continue;
      const withLng = { ...baseOptions, lng };
      if (i18n.exists(key, withLng)) {
        return asString(i18n.t(key, withLng));
      }
    }
  }

  return null;
}

/** Coerces an i18next return value to a string, or null when it is not a string. */
function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// =============================================================================
// Surface-level localization gate (R13.5, R19.6, R19.7)
// =============================================================================
//
// Whereas `resolveLocalizedOrFail` decides how a *single key* resolves, a
// surface (the timetable, the weekly planner) needs a coarser decision based on
// whether its required language packs are loaded at all. Centralizing it here —
// alongside the per-key policy — keeps every i18n "hard-fail vs fallback vs
// surface-gate" decision in one module, so each surface declares its policy
// explicitly instead of re-deriving en/ar availability ad hoc.

/**
 * How a surface reacts to partial language-pack availability:
 * - `block-only`      — display whenever at least one supported pack is
 *                       available; block only when none is (timetable, R13.5).
 * - `withhold-actions`— display read-only content when exactly one pack is
 *                       available but withhold mutating actions until both are
 *                       present (weekly planner, R19.6).
 */
export type LocalizationGatePolicy = "block-only" | "withhold-actions";

/**
 * Resolved gate state for a localized surface:
 * - `ready`            — all supported packs present; full content + actions.
 * - `actions-withheld` — partial availability under `withhold-actions`; render
 *                        read-only content but suppress actions (R19.6).
 * - `blocked`          — no supported pack present; hide/block the surface
 *                        entirely rather than render unlocalized (R13.5, R19.7).
 */
export type LocalizationGateState = "ready" | "actions-withheld" | "blocked";

/**
 * Decide a surface's localization gate from per-language pack availability.
 *
 * Pure: the caller injects the availability predicate (e.g.
 * `(lng) => i18n.hasResourceBundle(lng, "student")`) so this stays testable and
 * free of i18next state. The decision spans every supported language, so the
 * gate stays correct if a third language is ever added.
 */
export function resolveLocalizationGate(
  hasBundle: (language: string) => boolean,
  policy: LocalizationGatePolicy = "withhold-actions"
): LocalizationGateState {
  const availableCount = supportedLanguages.filter((lng) =>
    hasBundle(lng)
  ).length;

  // No supported pack loaded → block/hide the surface entirely (R13.5, R19.7).
  if (availableCount === 0) return "blocked";

  // Every supported pack loaded → full content and actions.
  if (availableCount === supportedLanguages.length) return "ready";

  // Partial availability: withhold actions (planner) or display anyway (timetable).
  return policy === "withhold-actions" ? "actions-withheld" : "ready";
}
