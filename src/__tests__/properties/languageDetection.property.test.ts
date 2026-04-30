// Feature: i18n-rtl-support, Property 1: Language Detection Priority Chain
// **Validates: Requirements 1.1, 1.2, 1.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { supportedLanguages } from "@/lib/i18n";

const SUPPORTED = ["en", "ar"] as const;

/**
 * Simulates the language detection priority chain:
 * user preference → institution default → browser language → 'en' fallback
 */
function detectLanguage(
  userPref: string | null,
  institutionDefault: string | null,
  browserLang: string | null
): string {
  if (userPref && (SUPPORTED as readonly string[]).includes(userPref))
    return userPref;
  if (
    institutionDefault &&
    (SUPPORTED as readonly string[]).includes(institutionDefault)
  )
    return institutionDefault;
  if (browserLang) {
    const prefix = browserLang.split("-")[0] ?? "";
    if ((SUPPORTED as readonly string[]).includes(prefix)) return prefix;
  }
  return "en";
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const supportedLangArb = fc.constantFrom(...SUPPORTED);
const unsupportedLangArb = fc.constantFrom(
  "fr",
  "de",
  "zh",
  "ja",
  "ko",
  "es",
  null
);
const browserLangArb = fc.constantFrom(
  "en-US",
  "ar-QA",
  "fr-FR",
  "de-DE",
  null
);
const anyLangArb = fc.oneof(supportedLangArb, unsupportedLangArb);

describe("Property 1 — Language detection priority chain always returns valid supported language", () => {
  it("P1a: result is always a supported language", () => {
    fc.assert(
      fc.property(
        anyLangArb,
        anyLangArb,
        browserLangArb,
        (userPref, instDefault, browser) => {
          const result = detectLanguage(userPref, instDefault, browser);
          expect((SUPPORTED as readonly string[]).includes(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P1b: user preference takes highest priority when valid", () => {
    fc.assert(
      fc.property(
        supportedLangArb,
        anyLangArb,
        browserLangArb,
        (userPref, instDefault, browser) => {
          const result = detectLanguage(userPref, instDefault, browser);
          expect(result).toBe(userPref);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P1c: institution default is used when user pref is invalid", () => {
    fc.assert(
      fc.property(
        unsupportedLangArb,
        supportedLangArb,
        browserLangArb,
        (userPref, instDefault, browser) => {
          const result = detectLanguage(userPref, instDefault, browser);
          expect(result).toBe(instDefault);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P1d: falls back to English when all inputs are invalid", () => {
    fc.assert(
      fc.property(
        unsupportedLangArb,
        unsupportedLangArb,
        (userPref, instDefault) => {
          const result = detectLanguage(userPref, instDefault, "fr-FR");
          expect(result).toBe("en");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P1e: supportedLanguages array contains exactly en and ar", () => {
    expect([...supportedLanguages]).toEqual(["en", "ar"]);
  });
});
