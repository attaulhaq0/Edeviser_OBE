import { z } from "zod";

export const createProgramSchema = z.object({
  name: z.string().min(1, "Program name is required").max(255),
  code: z.string().min(1, "Program code is required").max(50),
  description: z.string().optional(),
  institution_id: z.uuid(),
  coordinator_id: z.uuid().optional(),
  department_id: z.uuid().optional(),
});

export const updateProgramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  coordinator_id: z.uuid().optional(),
  department_id: z.uuid().optional(),
});

export type CreateProgramFormData = z.infer<typeof createProgramSchema>;
export type UpdateProgramFormData = z.infer<typeof updateProgramSchema>;
