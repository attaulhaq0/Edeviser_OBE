import { z } from "zod";

export const timetableSlotSchema = z.object({
  section_id: z.uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  room: z.string().min(1, "Room is required").max(100),
  slot_type: z.enum(["lecture", "lab", "tutorial"]),
});

export type TimetableSlotFormData = z.infer<typeof timetableSlotSchema>;
