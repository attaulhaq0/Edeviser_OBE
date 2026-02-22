import { z } from "zod";

export const academicCalendarEventSchema = z.object({
  semester_id: z.uuid(),
  title: z.string().min(1, "Event title is required").max(255),
  event_type: z.enum(["semester_start", "semester_end", "exam_period", "holiday", "registration", "custom"]),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  is_recurring: z.boolean().default(false),
});

export type AcademicCalendarEventFormData = z.infer<typeof academicCalendarEventSchema>;
