import { z } from "zod";

export const parentStudentLinkSchema = z.object({
  parent_id: z.uuid().nullable().optional(),
  student_id: z.uuid(),
  institution_id: z.uuid().optional(),
  relationship: z.enum(["mother", "father", "guardian", "other"]),
  relationship_label: z.string().max(80).optional(),
  status: z
    .enum([
      "pending_invitation",
      "pending_verification",
      "verified",
      "rejected",
      "revoked",
    ])
    .optional(),
});

export type ParentStudentLinkFormData = z.infer<typeof parentStudentLinkSchema>;
