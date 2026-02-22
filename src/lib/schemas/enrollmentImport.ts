import { z } from "zod";

export const enrollmentImportRowSchema = z.object({
  student_email: z.email("Invalid student email"),
  course_code: z.string().min(1, "Course code is required"),
  section_code: z.string().min(1, "Section code is required"),
});

export type EnrollmentImportRowData = z.infer<typeof enrollmentImportRowSchema>;
