// Task 145.2: Habit Difficulty Level Zod schema

import { z } from 'zod';

export const habitDifficultyLevelSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  habit_level_streak: z.number().int().min(0),
});

export type HabitDifficultyLevel = z.infer<typeof habitDifficultyLevelSchema>;
