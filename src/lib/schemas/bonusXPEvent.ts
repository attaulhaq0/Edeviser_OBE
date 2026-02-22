import { z } from "zod";

export const bonusXPEventSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  multiplier: z.number().positive(),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
  is_active: z.boolean(),
  created_by: z.uuid(),
});

export const createBonusEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  multiplier: z.number().positive().default(2),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
  is_active: z.boolean().default(true),
});

export type BonusXPEventData = z.infer<typeof bonusXPEventSchema>;
export type CreateBonusEventFormData = z.infer<typeof createBonusEventSchema>;
