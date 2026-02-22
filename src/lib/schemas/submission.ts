import { z } from "zod";

export const submissionSchema = z.object({
  assignment_id: z.uuid(),
  student_id: z.uuid(),
  file_url: z.string().url("Invalid file URL"),
  is_late: z.boolean().default(false),
});

export type SubmissionFormData = z.infer<typeof submissionSchema>;
