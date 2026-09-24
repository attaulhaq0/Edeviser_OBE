export type Language = "en" | "ar";

export const isLanguage = (value: unknown): value is Language =>
  value === "en" || value === "ar";

interface ProfileLanguageFields {
  readonly preferred_language?: unknown;
  readonly language_preference?: unknown;
}

/**
 * Writes already use preferred_language. Read that supported value first;
 * language_preference is a read-only legacy fallback, never a second write.
 * Unknown/missing values must not replace a valid device or current language.
 */
export const resolveProfileLanguage = (
  profile: ProfileLanguageFields | null | undefined
): Language | undefined => {
  if (isLanguage(profile?.preferred_language)) return profile.preferred_language;
  if (isLanguage(profile?.language_preference)) return profile.language_preference;
  return undefined;
};

export const resolveInitialLanguage = (
  profileLanguage: Language | undefined,
  savedLanguage: unknown,
  currentLanguage: string | undefined
): Language => {
  if (profileLanguage !== undefined) return profileLanguage;
  if (isLanguage(savedLanguage)) return savedLanguage;
  return currentLanguage?.split("-")[0] === "ar" ? "ar" : "en";
};
