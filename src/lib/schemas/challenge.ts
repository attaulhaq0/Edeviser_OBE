// Challenge Zod schemas for Social Challenges (Quests) feature

import { z } from 'zod';

// ── Legacy schemas (preserved for backward compatibility) ─────────────────────

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

// ── Social Challenges schemas ─────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const createChallengeSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
    description: z.string().max(500, 'Description must be at most 500 characters'),
    challenge_type: z.enum(['academic', 'habit', 'xp_race', 'blooms_climb', 'cooperative']),
    participation_mode: z.enum(['team', 'individual']),
    goal_target: z.number().int().positive('Goal target must be a positive integer'),
    start_date: z.string().datetime('Invalid start date format'),
    end_date: z.string().datetime('Invalid end date format'),
    reward_xp: z
      .number()
      .int()
      .min(50, 'Reward XP must be at least 50')
      .max(500, 'Reward XP must be at most 500'),
    reward_badge_id: z.string().nullable().optional(),
    xp_race_acknowledged: z.boolean().optional(),
  })
  .refine(
    (data) => new Date(data.end_date) > new Date(data.start_date),
    { message: 'End date must be after start date', path: ['end_date'] },
  )
  .refine(
    (data) => {
      const durationMs =
        new Date(data.end_date).getTime() - new Date(data.start_date).getTime();
      return durationMs >= TWENTY_FOUR_HOURS_MS;
    },
    { message: 'Challenge must be at least 24 hours long', path: ['end_date'] },
  )
  .refine(
    (data) => {
      const durationMs =
        new Date(data.end_date).getTime() - new Date(data.start_date).getTime();
      return durationMs <= NINETY_DAYS_MS;
    },
    { message: 'Challenge cannot exceed 90 days', path: ['end_date'] },
  )
  .refine(
    (data) =>
      data.challenge_type !== 'xp_race' || data.xp_race_acknowledged === true,
    {
      message: 'XP Race challenges require explicit acknowledgment',
      path: ['xp_race_acknowledged'],
    },
  );

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
