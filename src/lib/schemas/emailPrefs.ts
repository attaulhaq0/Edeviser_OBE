import { z } from "zod";

export const emailPreferencesSchema = z.object({
  streak_risk: z.boolean().default(true),
  weekly_summary: z.boolean().default(true),
  new_assignment: z.boolean().default(true),
  grade_released: z.boolean().default(true),
  notification_digest: z.boolean().default(false),
});

export type EmailPreferencesFormData = z.infer<typeof emailPreferencesSchema>;
