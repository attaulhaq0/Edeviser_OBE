import { z } from "zod";

export const gradeScaleSchema = z.object({
  letter: z.string().min(1).max(5),
  min_percent: z.number().min(0).max(100),
  max_percent: z.number().min(0).max(100),
  gpa_points: z.number().min(0).max(4),
});

export const leagueThresholdsSchema = z.object({
  bronze: z.number().min(0),
  silver: z.number().min(0),
  gold: z.number().min(0),
  diamond: z.number().min(0),
});

export const institutionSettingsSchema = z.object({
  attainment_thresholds: z.object({
    excellent: z.number().min(0).max(100),
    satisfactory: z.number().min(0).max(100),
    developing: z.number().min(0).max(100),
  }),
  success_threshold: z.number().min(0).max(100),
  accreditation_body: z.enum(["HEC", "QQA", "ABET", "NCAAA", "AACSB", "Generic"]),
  grade_scales: z.array(gradeScaleSchema).min(1, "At least one grade scale is required"),
  streak_sabbatical_enabled: z.boolean(),
  league_thresholds: leagueThresholdsSchema.optional(),
  default_language: z.enum(["en", "ar"]).optional(),
});

export type GradeScaleData = z.infer<typeof gradeScaleSchema>;
export type LeagueThresholdsData = z.infer<typeof leagueThresholdsSchema>;
export type InstitutionSettingsFormData = z.infer<typeof institutionSettingsSchema>;
