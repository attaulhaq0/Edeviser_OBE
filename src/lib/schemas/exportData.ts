import { z } from "zod";

export const exportRequestSchema = z.object({
  student_id: z.uuid(),
  format: z.enum(["json", "csv"]),
});

export type ExportRequestData = z.infer<typeof exportRequestSchema>;
