import { z } from "zod";

/**
 * Meaningful-content guard (QA FAIL-01): rejects whitespace-only,
 * punctuation-only, and control-character-only titles so garbage rows can
 * never reach learning_outcomes — via the form, the API, or an agent tool.
 */
export const meaningfulText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => /\p{L}|\p{N}/u.test(value),
      `${label} must contain letters or numbers (not only symbols or spaces)`
    );

export const createILOSchema = z.object({
  title: meaningfulText("Title").pipe(z.string().max(255)),
  title_ar: meaningfulText("Arabic title")
    .pipe(z.string().max(255))
    .optional()
    .or(z.literal("")),
  description: z.string().max(2000).optional(),
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

export const updateILOSchema = z.object({
  title: meaningfulText("Title").pipe(z.string().max(255)),
  title_ar: meaningfulText("Arabic title")
    .pipe(z.string().max(255))
    .optional()
    .or(z.literal("")),
  description: z.string().max(2000).optional(),
});

export type CreateILOFormData = z.infer<typeof createILOSchema>;
export type UpdateILOFormData = z.infer<typeof updateILOSchema>;
export type ReorderFormData = z.infer<typeof reorderSchema>;
