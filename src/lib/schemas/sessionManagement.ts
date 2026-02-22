import { z } from "zod";

export const sessionActionSchema = z.object({
  session_id: z.string().min(1),
  action: z.enum(["revoke", "revoke_all_others"]),
});

export type SessionActionFormData = z.infer<typeof sessionActionSchema>;
