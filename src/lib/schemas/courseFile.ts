import { z } from "zod";

export const courseFileRequestSchema = z.object({
  course_id: z.uuid(),
  semester_id: z.uuid(),
});

export type CourseFileRequestData = z.infer<typeof courseFileRequestSchema>;
