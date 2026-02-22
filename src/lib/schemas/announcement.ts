import { z } from "zod";

export const createAnnouncementSchema = z.object({
  course_id: z.uuid(),
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required"),
  is_pinned: z.boolean().default(false),
});

export type CreateAnnouncementFormData = z.infer<typeof createAnnouncementSchema>;
