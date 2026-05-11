// Task 150.3: Badge Spotlight Zod schema
// Requirements: 134.2

import { z } from "zod";

/**
 * Validates that a date string falls on a Monday (ISO day 1).
 */
function isMonday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCDay() === 1;
}

export const badgeSpotlightScheduleSchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
    .refine(isMonday, { message: "week_start must be a Monday" }),
  category: z.string().min(1, "Category is required"),
  is_manual: z.boolean().default(false),
});

export type BadgeSpotlightSchedule = z.infer<
  typeof badgeSpotlightScheduleSchema
>;
