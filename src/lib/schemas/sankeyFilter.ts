import { z } from 'zod';

export const sankeyFilterSchema = z.object({
  programId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
});

export type SankeyFilter = z.infer<typeof sankeyFilterSchema>;
