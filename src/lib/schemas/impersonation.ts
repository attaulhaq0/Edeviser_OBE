import { z } from "zod";

export const impersonationSchema = z.object({
  target_user_id: z.uuid(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type ImpersonationFormData = z.infer<typeof impersonationSchema>;
