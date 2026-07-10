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

  it("defaults every flag to false (old UI) with no override or env", () => {
    for (const flag of FEATURE_FLAGS) {
      expect(isFeatureEnabled(flag)).toBe(false);
    }
  });

  it("enables a flag when its env var is exactly 'true'", () => {
    vi.stubEnv("VITE_FF_NEW_UI_CHROME", "true");
    expect(isFeatureEnabled("newUiChrome")).toBe(true);
  });

  it("treats env values other than 'true'/'false' as unset (default false)", () => {
    vi.stubEnv("VITE_FF_NEW_UI_CHROME", "yes");
    expect(isFeatureEnabled("newUiChrome")).toBe(false);
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
    setFeatureOverride("newUiChrome", true);
    expect(isFeatureEnabled("newUiChrome")).toBe(true);
    setFeatureOverride("newUiChrome", null);
    expect(isFeatureEnabled("newUiChrome")).toBe(false);
  });

  it("setFeatureOverride dispatches an in-tab change event", () => {
    const handler = vi.fn();
    window.addEventListener(FEATURE_FLAG_EVENT, handler);
    setFeatureOverride("newUiAuth", true);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(FEATURE_FLAG_EVENT, handler);
  });

  it("flags are isolated from one another", () => {
    setFeatureOverride("newUiChrome", true);
    expect(isFeatureEnabled("newUiChrome")).toBe(true);
    expect(isFeatureEnabled("newUiModules")).toBe(false);
  });
});
