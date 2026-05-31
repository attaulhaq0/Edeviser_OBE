// =============================================================================
// Unit tests — mascot guidance moment→copy logic (R35)
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  resolveMascotGuidance,
  parseMascotEnabled,
  MASCOT_MOMENTS,
  MASCOT_MOMENT_IDS,
  MASCOT_ENABLED_DEFAULT,
  type MascotMomentId,
} from "@/lib/mascotGuidance";

describe("resolveMascotGuidance", () => {
  it("returns guidance for every key moment when enabled (R35.1, R35.2)", () => {
    for (const moment of MASCOT_MOMENT_IDS) {
      const guidance = resolveMascotGuidance({ enabled: true, moment });
      expect(guidance).not.toBeNull();
      expect(guidance?.moment).toBe(moment);
      expect(guidance?.i18nKey).toBe(MASCOT_MOMENTS[moment].i18nKey);
      expect(guidance?.tone).toBe(MASCOT_MOMENTS[moment].tone);
    }
  });

  it("returns null for every moment when disabled (R35.4)", () => {
    for (const moment of MASCOT_MOMENT_IDS) {
      expect(resolveMascotGuidance({ enabled: false, moment })).toBeNull();
    }
  });

  it("returns null when no moment is active, even if enabled (R35.5)", () => {
    expect(resolveMascotGuidance({ enabled: true, moment: null })).toBeNull();
  });

  it("returns null when disabled and no moment is active", () => {
    expect(resolveMascotGuidance({ enabled: false, moment: null })).toBeNull();
  });

  it("returns null for an unknown moment id without throwing", () => {
    const guidance = resolveMascotGuidance({
      enabled: true,
      moment: "not-a-moment" as MascotMomentId,
    });
    expect(guidance).toBeNull();
  });

  it("maps the password moment so coaching stays consistent on password screens (R35.2)", () => {
    const guidance = resolveMascotGuidance({
      enabled: true,
      moment: "password",
    });
    expect(guidance?.i18nKey).toBe("mascot.moments.password");
  });
});

describe("parseMascotEnabled", () => {
  it('parses "true"/"false" exactly', () => {
    expect(parseMascotEnabled("true")).toBe(true);
    expect(parseMascotEnabled("false")).toBe(false);
  });

  it("falls back to the default for null or malformed values", () => {
    expect(parseMascotEnabled(null)).toBe(MASCOT_ENABLED_DEFAULT);
    expect(parseMascotEnabled("")).toBe(MASCOT_ENABLED_DEFAULT);
    expect(parseMascotEnabled("yes")).toBe(MASCOT_ENABLED_DEFAULT);
  });
});
