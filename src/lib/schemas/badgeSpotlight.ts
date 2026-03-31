// Task 150.3: Badge Spotlight Zod schema

import { z } from 'zod';

export const badgeSpotlightScheduleSchema = z.object({
  week_start: z.string().refine((val) => {
    const d = new Date(val);
    return d.getDay() === 1; // Must be Monday
  }, 'week_start must be a Monday'),
  category: z.string().min(1),
  is_manual: z.boolean().default(false),
});

export type BadgeSpotlightSchedule = z.infer<typeof badgeSpotlightScheduleSchema>;
