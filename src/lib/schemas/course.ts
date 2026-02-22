import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().min(1, "Course name is required").max(255),
  code: z.string().min(1, "Course code is required").max(50),
  program_id: z.uuid(),
  semester_id: z.uuid(),
  teacher_id: z.uuid(),
  is_active: z.boolean().default(true),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  teacher_id: z.uuid().optional(),
  semester_id: z.uuid().optional(),
  is_active: z.boolean().optional(),
});

export type CreateCourseFormData = z.input<typeof createCourseSchema>;
export type UpdateCourseFormData = z.infer<typeof updateCourseSchema>;
