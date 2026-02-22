import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(255),
  code: z.string().min(1, "Department code is required").max(50),
  head_of_department_id: z.uuid().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  head_of_department_id: z.uuid().optional(),
});

export type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentFormData = z.infer<typeof updateDepartmentSchema>;
