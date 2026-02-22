import { z } from "zod";

export const programAccreditationSchema = z.object({
  program_id: z.uuid(),
  accreditation_body: z.string().min(1, "Accreditation body is required"),
  framework_version: z.string().optional(),
  accreditation_date: z.iso.date().optional(),
  next_review_date: z.iso.date().optional(),
  status: z.enum(["active", "expired", "pending"]).default("pending"),
});

export type ProgramAccreditationFormData = z.infer<typeof programAccreditationSchema>;
