import { z } from "zod";

export const createThreadSchema = z.object({
  course_id: z.uuid(),
  title: z.string().min(1, "Thread title is required").max(255),
  content: z.string().min(1, "Content is required"),
});

export const createReplySchema = z.object({
  thread_id: z.uuid(),
  content: z.string().min(1, "Reply content is required"),
});

export type CreateThreadFormData = z.infer<typeof createThreadSchema>;
export type CreateReplyFormData = z.infer<typeof createReplySchema>;
