import { z } from "zod";

export const journalEntrySchema = z.object({
  course_id: z.uuid(),
  student_id: z.uuid(),
  content: z.string().min(50, "Journal entry must be at least 50 characters"),
  prompt_text: z.string().optional(),
  is_shared: z.boolean().default(false),
  word_count: z.number().int().min(0).optional(),
});

export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;
