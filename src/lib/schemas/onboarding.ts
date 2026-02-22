import { z } from "zod";

export const onboardingStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  isCompleted: z.boolean(),
  route: z.string().min(1),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isCompleted: z.boolean(),
  route: z.string().min(1),
});

export type OnboardingStepData = z.infer<typeof onboardingStepSchema>;
export type ChecklistItemData = z.infer<typeof checklistItemSchema>;
