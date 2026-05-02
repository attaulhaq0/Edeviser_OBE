// Team Zod schemas for team management

import { z } from 'zod';

// ── Legacy schemas (preserved for backward compatibility) ─────────────────────

export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  course_id: z.string().uuid(),
});

export const teamMemberSchema = z.object({
  team_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export const autoGenerateTeamsSchema = z.object({
  course_id: z.string().uuid(),
  team_size: z.number().int().min(2).max(6),
});

export type CreateTeamInput = z.infer<typeof teamSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type AutoGenerateTeamsInput = z.infer<typeof autoGenerateTeamsSchema>;

// ── Team Challenges schemas ───────────────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50, 'Team name must be at most 50 characters'),
  course_id: z.string().uuid('Invalid course ID'),
  member_ids: z
    .array(z.string().uuid('Invalid member ID'))
    .min(2, 'A team must have at least 2 members')
    .max(6, 'A team can have at most 6 members'),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be at most 50 characters')
    .optional(),
  add_member_ids: z.array(z.string().uuid('Invalid member ID')).optional(),
  remove_member_ids: z.array(z.string().uuid('Invalid member ID')).optional(),
});

export type CreateTeamSchemaInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamSchemaInput = z.infer<typeof updateTeamSchema>;
