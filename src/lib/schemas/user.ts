import { z } from "zod";

const userRoleSchema = z.enum(["admin", "coordinator", "teacher", "student", "parent"]);

export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required").max(255),
  role: userRoleSchema,
  institution_id: z.uuid(),
  program_id: z.uuid().optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(255).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
  program_id: z.uuid().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
