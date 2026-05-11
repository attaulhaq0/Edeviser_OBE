// Task 112.2: Graduate Attribute Zod schemas

import { z } from "zod";

export const graduateAttributeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  code: z.string().min(1, "Code is required").max(20),
});

export const graduateAttributeMappingSchema = z.object({
  graduate_attribute_id: z.string().uuid(),
  ilo_id: z.string().uuid(),
  weight: z.number().min(0).max(1),
});

export type CreateGraduateAttributeInput = z.infer<
  typeof graduateAttributeSchema
>;
export type GraduateAttributeMappingInput = z.infer<
  typeof graduateAttributeMappingSchema
>;
