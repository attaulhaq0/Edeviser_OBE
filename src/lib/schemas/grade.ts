import { z } from "zod";

export const rubricSelectionSchema = z.object({
  criterion_id: z.uuid(),
  level_index: z.number().int().min(0),
  points: z.number().min(0),
});

export const gradeSchema = z.object({
  submission_id: z.uuid(),
  rubric_selections: z.array(rubricSelectionSchema).min(1),
  total_score: z.number().min(0),
  score_percent: z.number().min(0).max(100),
  overall_feedback: z.string().optional(),
});

export type RubricSelectionFormData = z.infer<typeof rubricSelectionSchema>;
export type GradeFormData = z.infer<typeof gradeSchema>;
