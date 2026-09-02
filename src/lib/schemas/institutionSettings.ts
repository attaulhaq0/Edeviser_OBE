import { z } from "zod";

export const gradeScaleSchema = z
  .object({
    letter: z.string().min(1).max(5),
    min_percent: z.number().min(0).max(100),
    max_percent: z.number().min(0).max(100),
    gpa_points: z.number().min(0).max(4),
  })
  .refine(
    (band) => band.min_percent <= band.max_percent,
    "Band minimum must not exceed its maximum"
  );

/**
 * Grade-scale integrity guard (QA FAIL-02 / FAIL-03 + E1.11): the configured
 * bands must form a CONTIGUOUS, non-overlapping partition of the continuous
 * [0, 100] domain so every real percentage maps to exactly one letter.
 * Adjacent bands must SHARE their boundary (touch); any strict gap (however
 * small — the legacy integer-adjacent scales left 84.0–85.0 unclassified and
 * rendered a passing 84.2% as "F") and any strict overlap (ambiguous zone) are
 * rejected at the schema boundary — UI, API, and agent tools alike. Boundary
 * points belong to the higher band via the descending first-match mapping in
 * `mapToLetterGrade`.
 */
export const gradeScalesPartitionSchema = z
  .array(gradeScaleSchema)
  .min(1, "At least one grade scale is required")
  .superRefine((bands, ctx) => {
    const sorted = [...bands].sort((a, b) => a.min_percent - b.min_percent);
    sorted.forEach((band, i) => {
      const prev = i > 0 ? sorted[i - 1] : undefined;
      if (prev) {
        if (band.min_percent < prev.max_percent) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["grade_scales", i],
            message: `Grade bands overlap: ${band.letter} starts at ${band.min_percent} but ${prev.letter} already covers up to ${prev.max_percent}`,
          });
        } else if (band.min_percent > prev.max_percent) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["grade_scales", i],
            message: `Grade bands leave a gap: ${prev.max_percent}–${band.min_percent} is not covered by any letter (adjacent bands must share their boundary)`,
          });
        }
      }
    });
    const last = sorted[sorted.length - 1];
    if (last && last.max_percent < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grade_scales", sorted.length - 1],
        message: `Top grade band must reach 100% (${last.letter} stops at ${last.max_percent})`,
      });
    }
    if (sorted[0] && sorted[0].min_percent > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grade_scales", 0],
        message: `Lowest grade band must start at 0% (${sorted[0].letter} starts at ${sorted[0].min_percent})`,
      });
    }
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
  accreditation_body: z.enum([
    "HEC",
    "QQA",
    "ABET",
    "NCAAA",
    "AACSB",
    "Generic",
  ]),
  grade_scales: gradeScalesPartitionSchema,
  streak_sabbatical_enabled: z.boolean(),
  league_thresholds: leagueThresholdsSchema.optional(),
  default_language: z.enum(["en", "ar"]).optional(),
});

export type GradeScaleData = z.infer<typeof gradeScaleSchema>;
export type LeagueThresholdsData = z.infer<typeof leagueThresholdsSchema>;
export type InstitutionSettingsFormData = z.infer<
  typeof institutionSettingsSchema
>;
