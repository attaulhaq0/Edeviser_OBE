import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  in_app: z.object({
    grades: z.boolean().default(true),
    assignments: z.boolean().default(true),
    badges: z.boolean().default(true),
    streaks: z.boolean().default(true),
    peer_milestones: z.boolean().default(true),
    announcements: z.boolean().default(true),
    discussions: z.boolean().default(true),
  }),
  email_digest: z.boolean().default(false),
  quiet_hours: z
    .object({
      enabled: z.boolean().default(false),
      start: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
      end: z.string().regex(/^\d{2}:\d{2}$/).default("07:00"),
    })
    .optional(),
});

export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;
