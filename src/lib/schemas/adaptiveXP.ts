// Task 137.2: Adaptive XP Zod schemas

import { z } from 'zod';

export const xpMultiplierSchema = z.object({
  level_multiplier: z.number().min(0.1).max(2.0),
  difficulty_multiplier: z.number().min(1.0).max(2.0),
  diminishing_multiplier: z.number().min(0.2).max(1.0),
});

export type XPMultiplier = z.infer<typeof xpMultiplierSchema>;

export const diminishingReturnsSchema = z.object({
  action_type: z.string().min(1),
  repeat_count: z.number().int().min(0),
  window_start: z.string().datetime(),
});

export type DiminishingReturns = z.infer<typeof diminishingReturnsSchema>;
