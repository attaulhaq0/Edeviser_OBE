// Feature: ui-prototype-migration — feature-flag resolution (R13.2 / G.4)
// Verifies the reversible-by-config gating: localStorage override > env > default.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  isFeatureEnabled,
  setFeatureOverride,
  FEATURE_FLAGS,
  FEATURE_FLAG_EVENT,
} from "@/lib/featureFlags";

describe("featureFlags", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("defaults implemented flags ON and newUiAuth OFF with no override or env", () => {
    // The implemented + reviewed modules default to the redesigned UI; the
    // not-yet-redesigned auth screens stay on the old UI.
    expect(isFeatureEnabled("newUiChrome")).toBe(true);
    expect(isFeatureEnabled("newUiDashboards")).toBe(true);
    expect(isFeatureEnabled("newUiModules")).toBe(true);
    expect(isFeatureEnabled("newUiAuth")).toBe(false);
    // Every declared flag still resolves to a boolean.
    for (const flag of FEATURE_FLAGS) {
      expect(typeof isFeatureEnabled(flag)).toBe("boolean");
    }
  });

  it("enables a flag when its env var is exactly 'true'", () => {
    vi.stubEnv("VITE_FF_NEW_UI_AUTH", "true");
    expect(isFeatureEnabled("newUiAuth")).toBe(true);
  });

  it("disables a default-on flag when its env var is exactly 'false'", () => {
    vi.stubEnv("VITE_FF_NEW_UI_CHROME", "false");
    expect(isFeatureEnabled("newUiChrome")).toBe(false);
  });

  it("treats env values other than 'true'/'false' as unset (per-flag default)", () => {
    // newUiAuth defaults OFF, so a non-boolean env string leaves it off.
    vi.stubEnv("VITE_FF_NEW_UI_AUTH", "yes");
    expect(isFeatureEnabled("newUiAuth")).toBe(false);
  });

  it("localStorage override 'on' wins over env 'false'", () => {
    vi.stubEnv("VITE_FF_NEW_UI_CHROME", "false");
    setFeatureOverride("newUiChrome", true);
    expect(isFeatureEnabled("newUiChrome")).toBe(true);
  });

  it("localStorage override 'off' wins over env 'true'", () => {
    vi.stubEnv("VITE_FF_NEW_UI_CHROME", "true");
    setFeatureOverride("newUiChrome", false);
    expect(isFeatureEnabled("newUiChrome")).toBe(false);
  });

  it("clearing the override falls back to env/default", () => {
    // newUiAuth defaults OFF, so clearing an 'on' override returns to false.
    setFeatureOverride("newUiAuth", true);
    expect(isFeatureEnabled("newUiAuth")).toBe(true);
    setFeatureOverride("newUiAuth", null);
    expect(isFeatureEnabled("newUiAuth")).toBe(false);
  });

  it("setFeatureOverride dispatches an in-tab change event", () => {
    const handler = vi.fn();
    window.addEventListener(FEATURE_FLAG_EVENT, handler);
    setFeatureOverride("newUiAuth", true);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(FEATURE_FLAG_EVENT, handler);
  });

  it("flags are isolated from one another", () => {
    // Override the default-OFF auth flag; the default-ON modules flag is untouched.
    setFeatureOverride("newUiAuth", true);
    expect(isFeatureEnabled("newUiAuth")).toBe(true);
    expect(isFeatureEnabled("newUiModules")).toBe(true);
  });
});
