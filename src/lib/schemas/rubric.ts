import { z } from "zod";

export const criterionSchema = z.object({
  criterion_name: z.string().min(1, "Criterion name is required"),
  sort_order: z.number().int().min(0),
  levels: z
    .array(
      z.object({
        label: z.string().min(1),
        description: z.string(),
        points: z.number().min(0),
      })
    )
    .min(2, "At least 2 performance levels required"),
  max_points: z.number().min(0),
});

export const rubricSchema = z.object({
  title: z.string().min(1, "Rubric title is required").max(255),
  clo_id: z.uuid(),
  is_template: z.boolean().default(false),
  criteria: z.array(criterionSchema).min(2, "At least 2 criteria required"),
});

export type CriterionFormData = z.infer<typeof criterionSchema>;
export type RubricFormData = z.infer<typeof rubricSchema>;
