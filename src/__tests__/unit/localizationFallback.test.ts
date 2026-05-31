// =============================================================================
// localization — runtime cross-language fallback (R22.6)
// =============================================================================
// Verifies resolveLocalizedOrFail resolves the active language first and falls
// back to the other supported language when only that one has the key, so the
// younger-student wording always displays (R22.6).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import i18n from "@/lib/i18n";
import {
  resolveLocalizationGate,
  resolveLocalizedOrFail,
} from "@/lib/localization";

const FALLBACK_KEY = "fallbackOnly.wording";
const EN_VALUE = "English only value";
const AR_VALUE = "قيمة عربية فقط";

describe("resolveLocalizedOrFail (R22.6)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    i18n.removeResourceBundle("en", "fallbackTest");
    i18n.removeResourceBundle("ar", "fallbackTest");
    await i18n.changeLanguage("en");
  });

  it("resolves the active language when present", () => {
    expect(
      resolveLocalizedOrFail("portfolio.friendly.strengths", { ns: "student" })
    ).toBe(i18n.t("student:portfolio.friendly.strengths"));
  });

  it("falls back to the available language when the active language lacks the key", async () => {
    // Only Arabic has the key; active language is English.
    i18n.addResource("ar", "fallbackTest", FALLBACK_KEY, AR_VALUE);
    await i18n.changeLanguage("en");

    const resolved = resolveLocalizedOrFail(FALLBACK_KEY, {
      ns: "fallbackTest",
      fallbackToOtherLang: true,
    });
    expect(resolved).toBe(AR_VALUE);
  });

  it("falls back from Arabic to English when only English resolves", async () => {
    i18n.addResource("en", "fallbackTest", FALLBACK_KEY, EN_VALUE);
    await i18n.changeLanguage("ar");

    const resolved = resolveLocalizedOrFail(FALLBACK_KEY, {
      ns: "fallbackTest",
      fallbackToOtherLang: true,
    });
    expect(resolved).toBe(EN_VALUE);
  });

  it("returns null when the key resolves in no supported language", () => {
    const resolved = resolveLocalizedOrFail("definitely.missing.key", {
      ns: "fallbackTest",
      fallbackToOtherLang: true,
    });
    expect(resolved).toBeNull();
  });

  it("does not fall back when fallbackToOtherLang is disabled", async () => {
    i18n.addResource("ar", "fallbackTest", FALLBACK_KEY, AR_VALUE);
    await i18n.changeLanguage("en");

    const resolved = resolveLocalizedOrFail(FALLBACK_KEY, {
      ns: "fallbackTest",
      fallbackToOtherLang: false,
    });
    expect(resolved).toBeNull();
  });

  it("interpolates params (used by the heatmap plain-language summary)", () => {
    const resolved = resolveLocalizedOrFail("heatmap.plainSummary.completion", {
      ns: "student",
      params: { rate: 80 },
    });
    expect(resolved).toContain("80");
  });
});

// =============================================================================
// resolveLocalizationGate — surface-level i18n gating (R13.5, R19.6, R19.7)
// =============================================================================
// The centralized gate decides whether a localized surface (timetable, weekly
// planner) renders fully, withholds its actions, or is blocked entirely, based
// on which supported language packs are available. The two policies encode the
// distinct requirements: `block-only` (timetable, R13.5) versus
// `withhold-actions` (planner, R19.6/19.7).

describe("resolveLocalizationGate", () => {
  const all = () => true;
  const none = () => false;
  const onlyEn = (lng: string) => lng === "en";
  const onlyAr = (lng: string) => lng === "ar";

  describe("withhold-actions policy (planner, R19.6/19.7)", () => {
    it("is ready when every supported pack is available", () => {
      expect(resolveLocalizationGate(all, "withhold-actions")).toBe("ready");
    });

    it("withholds actions when exactly one pack is available (R19.6)", () => {
      expect(resolveLocalizationGate(onlyEn, "withhold-actions")).toBe(
        "actions-withheld"
      );
      expect(resolveLocalizationGate(onlyAr, "withhold-actions")).toBe(
        "actions-withheld"
      );
    });

    it("blocks the surface when no pack is available (R19.7)", () => {
      expect(resolveLocalizationGate(none, "withhold-actions")).toBe("blocked");
    });

    it("defaults to the withhold-actions policy", () => {
      expect(resolveLocalizationGate(onlyEn)).toBe("actions-withheld");
    });
  });

  describe("block-only policy (timetable, R13.5)", () => {
    it("is ready when every supported pack is available", () => {
      expect(resolveLocalizationGate(all, "block-only")).toBe("ready");
    });

    it("still renders when only one pack is available (no action gating)", () => {
      expect(resolveLocalizationGate(onlyEn, "block-only")).toBe("ready");
      expect(resolveLocalizationGate(onlyAr, "block-only")).toBe("ready");
    });

    it("blocks the surface only when neither pack is available (R13.5)", () => {
      expect(resolveLocalizationGate(none, "block-only")).toBe("blocked");
    });
  });
});
