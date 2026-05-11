// Task 114.2: Competency Framework Zod schemas

import { z } from "zod";

export const competencyFrameworkSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  version: z.string().min(1, "Version is required").max(20),
  source: z.string().max(100).optional(),
});

export const competencyItemSchema = z.object({
  framework_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  level: z.enum(["domain", "competency", "indicator"]),
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(300),
});

export const competencyCSVRowSchema = z.object({
  domain_code: z.string().min(1),
  domain_title: z.string().min(1),
  competency_code: z.string().min(1),
  competency_title: z.string().min(1),
  indicator_code: z.string().min(1),
  indicator_title: z.string().min(1),
});

export type CreateCompetencyFrameworkInput = z.infer<
  typeof competencyFrameworkSchema
>;
export type CompetencyItemInput = z.infer<typeof competencyItemSchema>;
export type CompetencyCSVRow = z.infer<typeof competencyCSVRowSchema>;
