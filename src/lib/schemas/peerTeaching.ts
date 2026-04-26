// =============================================================================
// Peer Teaching Zod Schemas — Task 1.26
// =============================================================================

import { z } from 'zod';

/** Schema for creating a peer teaching moment */
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
  media_url: z.string().url('Invalid URL').nullable().optional(),
});

export type CreateTeachingMomentInput = z.infer<typeof createTeachingMomentSchema>;

/** Schema for rating a peer teaching moment */
export const rateTeachingMomentSchema = z.object({
  teaching_moment_id: z.string().uuid('Invalid teaching moment ID'),
  clarity_rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  helpfulness_rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
});

export type RateTeachingMomentInput = z.infer<typeof rateTeachingMomentSchema>;
