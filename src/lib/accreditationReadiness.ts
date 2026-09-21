import { z } from "zod";

// The RPC's course-coverage aggregate and its pack checklist are distinct scopes.
// Validate the response rather than rendering malformed/unknown states as complete.
export const accreditationReadinessSchema = z.object({
  readinessPercent: z.number().min(0).max(100),
  documented: z.number().int().nonnegative(),
  partial: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  notStarted: z.number().int().nonnegative(),
  courses: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      status: z.enum(["documented", "partial", "blocked", "not_started"]),
    })
  ),
  pack: z
    .array(
      z.object({
        key: z.string().min(1),
        state: z.enum(["done", "prog", "pending"]),
      })
    )
    .refine(
      (items) => new Set(items.map((item) => item.key)).size === items.length
    ),
});

export type AccreditationReadiness = z.infer<
  typeof accreditationReadinessSchema
>;
export type AccreditationPackItem = AccreditationReadiness["pack"][number];
export type AccreditationCourse = AccreditationReadiness["courses"][number];
export type EvidenceStatus = AccreditationCourse["status"];

/** Checklist completion only, NOT accreditation compliance or academic attainment.
 * All declared returned items count equally; in-progress earns no completion credit.
 * No denominator means unknown, never 0% or 100% readiness.
 */
export const calculatePackCompletion = (
  pack: readonly AccreditationPackItem[]
) => {
  if (pack.length === 0) return null;
  const complete = pack.filter((item) => item.state === "done").length;
  return {
    total: pack.length,
    complete,
    inProgress: pack.filter((item) => item.state === "prog").length,
    outstanding: pack.filter((item) => item.state === "pending").length,
    percent: Math.floor((complete / pack.length) * 100),
  };
};
