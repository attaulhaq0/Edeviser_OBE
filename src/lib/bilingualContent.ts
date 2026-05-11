export interface BilingualField {
  en?: string | null;
  ar?: string | null;
}

/**
 * Resolves a bilingual field to the appropriate language version.
 * Falls back to the other language if the active language version is empty.
 */
export const resolveBilingualContent = (
  field: BilingualField,
  activeLanguage: string
): string => {
  const primary = activeLanguage === "ar" ? field.ar : field.en;
  const fallback = activeLanguage === "ar" ? field.en : field.ar;
  return primary?.trim() || fallback?.trim() || "";
};

/**
 * Creates a bilingual field object from separate values.
 */
export const createBilingualField = (
  en: string | null,
  ar: string | null
): BilingualField => ({ en, ar });
