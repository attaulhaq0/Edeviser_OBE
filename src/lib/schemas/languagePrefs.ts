import { z } from 'zod';

export const supportedLanguages = ['en', 'ar'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languagePreferenceSchema = z.object({
  language: z.enum(supportedLanguages),
});

export type LanguagePreferenceFormData = z.infer<typeof languagePreferenceSchema>;
