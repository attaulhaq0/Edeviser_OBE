// Task 134.2: Challenge Zod schemas

import { z } from 'zod';

export const challengeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  challenge_type: z.enum(['team', 'course_wide']),
  course_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  goal_metric: z.enum(['total_xp', 'habits_completed', 'assignments_submitted', 'quiz_score_avg']),
  goal_target: z.number().int().positive(),
  reward_type: z.enum(['xp_bonus', 'badge']),
  reward_value: z.number().int().min(0),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] },
);

export type ChallengeInput = z.infer<typeof challengeSchema>;

export const challengeProgressSchema = z.object({
  challenge_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  participant_type: z.enum(['team', 'student']),
  current_progress: z.number().int().min(0),
});

export type ChallengeProgressInput = z.infer<typeof challengeProgressSchema>;
