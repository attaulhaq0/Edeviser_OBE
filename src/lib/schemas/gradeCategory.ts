import { z } from "zod";

export const gradeCategorySchema = z.object({
  course_id: z.uuid(),
  name: z.string().min(1, "Category name is required").max(100),
  weight_percent: z.number().min(0).max(100),
  sort_order: z.number().int().min(0),
});

export type GradeCategoryFormData = z.infer<typeof gradeCategorySchema>;
