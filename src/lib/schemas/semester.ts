import { z } from "zod";

export const createSemesterSchema = z.object({
  name: z.string().min(1, "Semester name is required").max(255),
  code: z.string().min(1, "Semester code is required").max(50),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  is_active: z.boolean().default(false),
});

export const updateSemesterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  start_date: z.iso.date().optional(),
  end_date: z.iso.date().optional(),
  is_active: z.boolean().optional(),
});

export type CreateSemesterFormData = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterFormData = z.infer<typeof updateSemesterSchema>;
