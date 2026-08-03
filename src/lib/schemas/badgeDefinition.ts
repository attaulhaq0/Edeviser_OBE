import { z } from "zod";

export const badgeDefinitionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  badge_key: z
    .string()
    .trim()
    .min(1, "Badge key is required")
    .max(80)
    .regex(
      /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and underscores"
    ),
  description: z.string().trim().max(240),
  emoji: z.string().trim().min(1, "Emoji is required").max(12),
  category: z.string().trim().max(40),
  bronze_condition: z.string().trim().max(120),
  silver_condition: z.string().trim().max(120),
  gold_condition: z.string().trim().max(120),
});

export type BadgeDefinitionFormValues = z.infer<typeof badgeDefinitionSchema>;
