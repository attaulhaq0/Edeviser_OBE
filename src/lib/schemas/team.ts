// Task 128.2: Team Zod schemas

import { z } from 'zod';

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
