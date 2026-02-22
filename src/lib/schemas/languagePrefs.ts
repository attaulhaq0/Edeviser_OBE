import { z } from "zod";

export const languagePreferenceSchema = z.object({
  language: z.enum(["en", "ur", "ar"]),
});

export type LanguagePreferenceFormData = z.infer<typeof languagePreferenceSchema>;
