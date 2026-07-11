// =============================================================================
// coordinatorAcademic — Zod schema for the coordinator "Me" academic edit form
// =============================================================================
// Validates the self-service academic profile fields (migration 20260823000001).
// All fields are optional (blank allowed); years_experience must be blank or a
// non-negative integer ≤ 80. Form values are strings (controlled inputs); the
// submit handler maps blanks → null and the experience string → number.
// =============================================================================

import { z } from "zod";

export const coordinatorAcademicSchema = z.object({
  department: z.string().trim().max(120),
  designation: z.string().trim().max(120),
  academic_rank: z.string().trim().max(120),
  highest_degree: z.string().trim().max(120),
  years_experience: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) <= 80),
      "Enter a whole number of years (0–80)"
    ),
});

export type CoordinatorAcademicFormValues = z.infer<
  typeof coordinatorAcademicSchema
>;
