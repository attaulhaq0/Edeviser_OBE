import { z } from "zod";

export const bloomsLevelSchema = z.enum([
  "remembering",
  "understanding",
  "applying",
  "analyzing",
  "evaluating",
  "creating",
]);

export const createCLOSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  course_id: z.uuid(),
  blooms_level: bloomsLevelSchema,
  sort_order: z.number().int().min(0).optional(),
  plo_mappings: z
    .array(
      z.object({
        plo_id: z.uuid(),
        weight: z.number().min(0).max(1),
      })
    )
    .optional(),
});

export type BloomsLevel = z.infer<typeof bloomsLevelSchema>;
export type CreateCLOFormData = z.infer<typeof createCLOSchema>;
