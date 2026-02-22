import { z } from "zod";

export const createPLOSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  program_id: z.uuid(),
  sort_order: z.number().int().min(0).optional(),
});

export const mappingSchema = z.object({
  plo_id: z.uuid(),
  ilo_mappings: z.array(
    z.object({
      ilo_id: z.uuid(),
      weight: z.number().min(0).max(1),
    })
  ),
});

export type CreatePLOFormData = z.infer<typeof createPLOSchema>;
export type MappingFormData = z.infer<typeof mappingSchema>;
