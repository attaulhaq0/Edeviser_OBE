import { z } from 'zod';

export const subCLOSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  code: z.string().min(1, 'Code is required').max(50),
  weight: z.number().min(0, 'Weight must be ≥ 0').max(1, 'Weight must be ≤ 1'),
  parent_outcome_id: z.string().uuid('Parent CLO ID is required'),
});

export type SubCLOFormData = z.infer<typeof subCLOSchema>;

/**
 * Validates that sibling Sub-CLO weights sum to 1.0 (±0.001 tolerance).
 * Pass the full array of weights including the one being added/edited.
 */
export const subCLOWeightSumSchema = z
  .array(z.number().min(0).max(1))
  .refine(
    (weights) => {
      if (weights.length === 0) return true;
      const sum = weights.reduce((a, b) => a + b, 0);
      return Math.abs(sum - 1.0) <= 0.001;
    },
    { message: 'Sub-CLO weights must sum to 1.0' },
  );

/**
 * Pure function to check weight sum validity — useful in UI indicators.
 */
export function isWeightSumValid(weights: number[]): boolean {
  if (weights.length === 0) return true;
  const sum = weights.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) <= 0.001;
}
