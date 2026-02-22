import { z } from "zod";

export const themePreferenceSchema = z.object({
  theme_preference: z.enum(["light", "dark", "system"]),
});

export type ThemePreferenceFormData = z.infer<typeof themePreferenceSchema>;
