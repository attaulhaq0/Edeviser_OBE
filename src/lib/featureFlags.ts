// =============================================================================
// Feature flags — UI prototype migration (spec: .kiro/specs/ui-prototype-migration)
// =============================================================================
//
// Presentation-only, reversible-by-config gating (R13.2 / G.4): each new-UI
// module ships behind a flag so it can be turned on/off WITHOUT a redeploy, and
// the old component is retained until its parity gate is signed off.
//
// Resolution order (first decisive value wins):
//   1. localStorage override  `edeviser-ff:<flag>` = "on" | "off"
//      → per-browser runtime toggle for dev review / instant rollback.
//   2. build-time env var      VITE_FF_<FLAG> (on import.meta.env) = "true"/"false"
//      → per-deploy default (read via STATIC member access so Vite inlines it).
//   3. default → false (old UI).
//
// NOTE: env vars are read through a switch of static per-flag `import.meta.env`
// reads (one per VITE_FF_* name) so Vite can statically replace them in
// production builds; a dynamic `import.meta.env[key]` would NOT be inlined.
// Reading at call-time (not module load) keeps the resolver test-friendly
// (`vi.stubEnv`).
// =============================================================================

export const FEATURE_FLAGS = [
  "newUiChrome", // P1  — GlobalHeader / Sidebar / role layouts
  "newUiAuth", // P1b — Login / Signup / Reset / Update password
  "newUiDashboards", // P2  — the 5 role dashboards
  "newUiModules", // P3  — remaining module screens
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

const STORAGE_PREFIX = "edeviser-ff:";

/** In-tab change event (the native `storage` event only fires across tabs). */
export const FEATURE_FLAG_EVENT = "edeviser-ff-change";

/** Read the build-time env value for a flag via static access (Vite-inlinable). */
const readEnvFlag = (flag: FeatureFlag): string | undefined => {
  switch (flag) {
    case "newUiChrome":
      return import.meta.env.VITE_FF_NEW_UI_CHROME;
    case "newUiAuth":
      return import.meta.env.VITE_FF_NEW_UI_AUTH;
    case "newUiDashboards":
      return import.meta.env.VITE_FF_NEW_UI_DASHBOARDS;
    case "newUiModules":
      return import.meta.env.VITE_FF_NEW_UI_MODULES;
  }
};

const readOverride = (flag: FeatureFlag): "on" | "off" | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const v = window.localStorage.getItem(`${STORAGE_PREFIX}${flag}`);
    return v === "on" || v === "off" ? v : null;
  } catch {
    // localStorage can throw (privacy mode / disabled) — treat as no override.
    return null;
  }
};

/**
 * Per-flag default (used when there is no localStorage override and no env var).
 * The implemented + reviewed modules (chrome, dashboards, module screens) now
 * default ON so the redesigned UI is the active experience; the old components
 * remain reachable via an `off` override until the legacy-removal cleanup.
 * `newUiAuth` stays OFF because the auth screens are not redesigned yet.
 */
const DEFAULT_ON: Record<FeatureFlag, boolean> = {
  newUiChrome: true,
  newUiAuth: false,
  newUiDashboards: true,
  newUiModules: true,
};

/** Resolve whether a feature flag is enabled (see resolution order above). */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  const override = readOverride(flag);
  if (override) return override === "on";

  const env = readEnvFlag(flag);
  if (env === "true") return true;
  if (env === "false") return false;

  return DEFAULT_ON[flag];
};

/**
 * Set (or clear) the per-browser runtime override for a flag. Pass `null` to
 * clear it and fall back to the env/default. Dispatches {@link FEATURE_FLAG_EVENT}
 * so same-tab subscribers (e.g. `useFeatureFlag`) re-render immediately.
 */
export const setFeatureOverride = (
  flag: FeatureFlag,
  value: boolean | null
): void => {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = `${STORAGE_PREFIX}${flag}`;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value ? "on" : "off");
    window.dispatchEvent(
      new CustomEvent(FEATURE_FLAG_EVENT, { detail: { flag } })
    );
  } catch {
    // Ignore storage failures — the flag simply stays at its prior value.
  }
};
