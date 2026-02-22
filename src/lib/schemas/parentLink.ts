import { z } from "zod";

export const parentStudentLinkSchema = z.object({
  parent_id: z.uuid(),
  student_id: z.uuid(),
  relationship: z.enum(["parent", "guardian"]),
});

export type ParentStudentLinkFormData = z.infer<typeof parentStudentLinkSchema>;
