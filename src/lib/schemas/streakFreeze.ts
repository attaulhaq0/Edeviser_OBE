import { z } from "zod";

export const streakFreezePurchaseSchema = z.object({
  student_id: z.uuid(),
  xp_cost: z.literal(200),
});

export type StreakFreezePurchaseData = z.infer<typeof streakFreezePurchaseSchema>;
