import { z } from "zod";

export const cookieConsentSchema = z.object({
  essential: z.literal(true),
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  consented_at: z.iso.datetime(),
});

export type CookieConsentFormData = z.infer<typeof cookieConsentSchema>;
