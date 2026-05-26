// Task 112.2: Graduate Attribute Zod schemas

import { z } from "zod";

export const graduateAttributeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const graduateAttributeMappingSchema = z.object({
  graduate_attribute_id: z.string().uuid(),
  outcome_id: z.string().uuid(),
  weight: z.number().min(0).max(1),
});

export type CreateGraduateAttributeInput = z.infer<
  typeof graduateAttributeSchema
>;
export type GraduateAttributeMappingInput = z.infer<
  typeof graduateAttributeMappingSchema
>;
