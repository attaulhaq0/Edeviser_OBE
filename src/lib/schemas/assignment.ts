import { z } from "zod";

export const cloWeightSchema = z.object({
  clo_id: z.uuid(),
  weight: z.number().min(0).max(100),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  course_id: z.uuid(),
  due_date: z.iso.datetime(),
  total_marks: z.number().int().min(1),
  rubric_id: z.uuid(),
  clo_weights: z
    .array(cloWeightSchema)
    .min(1, "At least 1 CLO required")
    .max(3, "Maximum 3 CLOs allowed"),
  late_window_hours: z.number().int().min(0).default(24),
  prerequisites: z
    .array(
      z.object({
        clo_id: z.uuid(),
        required_attainment: z.number().min(0).max(100),
      })
    )
    .optional(),
});

export type CLOWeightFormData = z.infer<typeof cloWeightSchema>;
export type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>;
