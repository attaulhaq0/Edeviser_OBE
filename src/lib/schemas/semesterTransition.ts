import { z } from "zod";

export const semesterTransitionSchema = z.object({
  from_semester_id: z.uuid(),
  to_semester_id: z.uuid(),
  archive_grades: z.boolean().default(true),
  deactivate_courses: z.boolean().default(true),
  carry_forward_enrollments: z.boolean().default(false),
});

export type SemesterTransitionFormData = z.infer<typeof semesterTransitionSchema>;
