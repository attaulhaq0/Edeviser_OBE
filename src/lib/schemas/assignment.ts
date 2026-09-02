import { z } from "zod";

export const cloWeightSchema = z.object({
  clo_id: z.uuid(),
  weight: z.number().min(0).max(100),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  course_id: z.uuid(),
  // QA 2026-09-02 (V4): the form uses type="datetime-local", which yields
  // "YYYY-MM-DDTHH:mm" (no seconds / no Z). `z.iso.datetime()` rejected that,
  // blocking every create. Accept any parseable date; the form canonicalizes
  // to a UTC ISO string before the mutation fires.
  due_date: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "Enter a valid due date",
    }),
  total_marks: z.number().int().min(1),
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
  tutor_autonomy_level: z.enum(["L1", "L2", "L3"]).optional(),
});

export type CLOWeightFormData = z.infer<typeof cloWeightSchema>;
export type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>;
