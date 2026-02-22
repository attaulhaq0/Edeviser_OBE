import { z } from "zod";

export const gradeScaleSchema = z.object({
  letter: z.string().min(1).max(5),
  min_percent: z.number().min(0).max(100),
  max_percent: z.number().min(0).max(100),
  gpa_points: z.number().min(0).max(4),
});

export const institutionSettingsSchema = z.object({
  attainment_thresholds: z.object({
    excellent: z.number().min(0).max(100).default(85),
    satisfactory: z.number().min(0).max(100).default(70),
    developing: z.number().min(0).max(100).default(50),
  }),
  success_threshold: z.number().min(0).max(100).default(70),
  accreditation_body: z.enum(["HEC", "QQA", "ABET", "NCAAA", "AACSB", "Generic"]).default("Generic"),
  grade_scales: z.array(gradeScaleSchema),
});

export type GradeScaleData = z.infer<typeof gradeScaleSchema>;
export type InstitutionSettingsFormData = z.infer<typeof institutionSettingsSchema>;
