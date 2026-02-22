import { z } from "zod";

const cqiStatusSchema = z.enum(["planned", "in_progress", "completed", "evaluated"]);

export const createCQIPlanSchema = z.object({
  program_id: z.uuid(),
  semester_id: z.uuid(),
  outcome_id: z.uuid(),
  outcome_type: z.enum(["PLO", "CLO"]),
  baseline_attainment: z.number().min(0).max(100),
  target_attainment: z.number().min(0).max(100),
  action_description: z.string().min(1, "Action description is required"),
  responsible_person: z.string().min(1, "Responsible person is required"),
  status: cqiStatusSchema.default("planned"),
});

export const updateCQIPlanSchema = z.object({
  action_description: z.string().min(1).optional(),
  responsible_person: z.string().min(1).optional(),
  status: cqiStatusSchema.optional(),
  result_attainment: z.number().min(0).max(100).optional(),
});

export type CreateCQIPlanFormData = z.infer<typeof createCQIPlanSchema>;
export type UpdateCQIPlanFormData = z.infer<typeof updateCQIPlanSchema>;
