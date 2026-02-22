import { z } from "zod";

export const csvRowSchema = z.object({
  email: z.email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["admin", "coordinator", "teacher", "student", "parent"]),
  program_id: z.uuid().optional(),
});

export type CSVRowData = z.infer<typeof csvRowSchema>;
