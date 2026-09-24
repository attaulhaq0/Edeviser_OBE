import { describe, expect, it } from "vitest";
import { isLanguage, resolveInitialLanguage, resolveProfileLanguage } from "@/lib/languagePreference";

describe("profile language read policy", () => {
  it.each([
    { preferred_language: "en", language_preference: "ar", expected: "en" },
    { preferred_language: "ar", language_preference: "en", expected: "ar" },
    { preferred_language: undefined, language_preference: "ar", expected: "ar" },
    { preferred_language: null, language_preference: "en", expected: "en" },
    { preferred_language: "invalid", language_preference: "ar", expected: "ar" },
    { preferred_language: "ar", language_preference: "invalid", expected: "ar" },
    { preferred_language: "ur", language_preference: "fr", expected: undefined },
  ])("resolves preferred=$preferred_language and legacy=$language_preference to $expected", (profile) => {
    expect(resolveProfileLanguage(profile)).toBe(profile.expected);
  });

  it("does not invent a profile preference when neither supported field exists", () => {
    expect(resolveProfileLanguage(null)).toBeUndefined();
    expect(resolveProfileLanguage({})).toBeUndefined();
  });

  it("gives a matching profile precedence over a saved device language", () => {
    expect(resolveInitialLanguage("en", "ar", "ar")).toBe("en");
  });

  it("honors supported saved anonymous language even when i18n initialized earlier", () => {
    expect(resolveInitialLanguage(undefined, "ar", "en")).toBe("ar");
  });

  it("falls back to current supported locale when saved data is invalid", () => {
    expect(resolveInitialLanguage(undefined, "ur", "ar-QA")).toBe("ar");
    expect(resolveInitialLanguage(undefined, null, "en-US")).toBe("en");
    expect(resolveInitialLanguage(undefined, null, undefined)).toBe("en");
    expect(isLanguage("ur")).toBe(false);
  });
});
