// Task 139.2: Improvement Bonus Zod schema

import { z } from 'zod';

export const improvementBonusSchema = z.object({
  clo_id: z.string().uuid(),
  previous_percent: z.number().min(0).max(100),
  current_percent: z.number().min(0).max(100),
  bonus_xp: z.number().int().positive(),
});

export type ImprovementBonus = z.infer<typeof improvementBonusSchema>;
