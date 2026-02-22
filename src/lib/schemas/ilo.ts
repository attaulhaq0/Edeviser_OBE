import { z } from "zod";

export const createILOSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  institution_id: z.uuid(),
  sort_order: z.number().int().min(0).optional(),
});

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      sort_order: z.number().int().min(0),
    })
  ),
});

export type CreateILOFormData = z.infer<typeof createILOSchema>;
export type ReorderFormData = z.infer<typeof reorderSchema>;
