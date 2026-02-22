import { z } from "zod";

export const gradeExportSchema = z.object({
  course_id: z.uuid(),
  semester_id: z.uuid().optional(),
  format: z.enum(["csv", "xlsx"]),
  include_clo_attainment: z.boolean().default(false),
});

export type GradeExportFormData = z.infer<typeof gradeExportSchema>;
