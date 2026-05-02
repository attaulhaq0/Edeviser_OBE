// Peer Teaching Moment Zod schemas for the Team Challenges feature.
// Validates teaching moment creation and rating inputs.

import { z } from 'zod';

export const createTeachingMomentSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  clo_id: z.string().uuid('Invalid CLO ID'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be at most 100 characters'),
  explanation_text: z
    .string()
    .min(50, 'Explanation must be at least 50 characters')
    .max(500, 'Explanation must be at most 500 characters'),
  media_url: z.string().url('Invalid URL format').nullable().optional(),
});

export const rateTeachingMomentSchema = z.object({
  teaching_moment_id: z.string().uuid('Invalid teaching moment ID'),
  clarity_rating: z
    .number()
    .int('Clarity rating must be a whole number')
    .min(1, 'Clarity rating must be at least 1')
    .max(5, 'Clarity rating must be at most 5'),
  helpfulness_rating: z
    .number()
    .int('Helpfulness rating must be a whole number')
    .min(1, 'Helpfulness rating must be at least 1')
    .max(5, 'Helpfulness rating must be at most 5'),
});

export type CreateTeachingMomentInput = z.infer<typeof createTeachingMomentSchema>;
export type RateTeachingMomentInput = z.infer<typeof rateTeachingMomentSchema>;
