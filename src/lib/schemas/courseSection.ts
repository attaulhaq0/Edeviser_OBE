import { z } from "zod";

export const createSectionSchema = z.object({
  course_id: z.uuid(),
  section_code: z.string().min(1, "Section code is required").max(10),
  teacher_id: z.uuid(),
  capacity: z.number().int().min(1).default(50),
  is_active: z.boolean().default(true),
});

export const updateSectionSchema = z.object({
  section_code: z.string().min(1).max(10).optional(),
  teacher_id: z.uuid().optional(),
  capacity: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

export type CreateSectionFormData = z.infer<typeof createSectionSchema>;
export type UpdateSectionFormData = z.infer<typeof updateSectionSchema>;
