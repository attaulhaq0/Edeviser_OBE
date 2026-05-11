// Task 150.2: Badge Tier Zod schemas

import { z } from "zod";

export const badgeTierSchema = z.object({
  tier: z.enum(["bronze", "silver", "gold"]),
  category: z.string().min(1),
});

export type BadgeTier = z.infer<typeof badgeTierSchema>;

export const tieredBadgeSchema = z.object({
  category: z.string().min(1),
  current_tier: z.enum(["bronze", "silver", "gold"]).nullable(),
  progress: z.number().min(0).max(100),
  is_pinned: z.boolean().default(false),
  archived_at: z.string().datetime().nullable().default(null),
});

export type TieredBadge = z.infer<typeof tieredBadgeSchema>;

export const badgePinSchema = z.object({
  student_badge_id: z.string().uuid(),
  is_pinned: z.boolean(),
});

export type BadgePin = z.infer<typeof badgePinSchema>;
