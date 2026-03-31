import { z } from 'zod';

export const coverageHeatmapFilterSchema = z.object({
  programId: z.string().uuid(),
  semesterId: z.string().uuid().optional(),
  attainmentThreshold: z.number().min(0).max(100).optional(),
});

export type CoverageHeatmapFilter = z.infer<typeof coverageHeatmapFilterSchema>;
