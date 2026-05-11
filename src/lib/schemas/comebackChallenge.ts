// Task 143.2: Comeback Challenge Zod schemas

import { z } from "zod";

export const comebackChallengeStateSchema = z.object({
  is_active: z.boolean(),
  days_completed: z.number().int().min(0).max(3),
  streak_to_restore: z.number().int().min(0),
});

export type ComebackChallengeState = z.infer<
  typeof comebackChallengeStateSchema
>;
