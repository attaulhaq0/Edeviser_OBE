import { z } from 'zod';

export const gapAnalysisFilterSchema = z.object({
  programId: z.string().uuid(),
  semesterId: z.string().uuid().optional(),
});

export type GapAnalysisFilter = z.infer<typeof gapAnalysisFilterSchema>;
