import { z } from "zod";

export const habitLogSchema = z.object({
  student_id: z.uuid(),
  date: z.iso.date(),
  habit_type: z.enum(["login", "submit", "journal", "read"]),
});

export type HabitLogFormData = z.infer<typeof habitLogSchema>;
