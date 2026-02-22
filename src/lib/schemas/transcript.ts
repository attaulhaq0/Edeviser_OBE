import { z } from "zod";

export const transcriptRequestSchema = z.object({
  student_id: z.uuid(),
  semester_id: z.uuid().optional(),
});

export type TranscriptRequestData = z.infer<typeof transcriptRequestSchema>;
