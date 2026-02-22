import { z } from "zod";

export const createSessionSchema = z.object({
  section_id: z.uuid(),
  session_date: z.iso.date(),
  session_type: z.enum(["lecture", "lab", "tutorial"]),
  topic: z.string().min(1, "Topic is required").max(255),
});

export const attendanceRecordSchema = z.object({
  session_id: z.uuid(),
  records: z.array(
    z.object({
      student_id: z.uuid(),
      status: z.enum(["present", "absent", "late", "excused"]),
    })
  ),
});

export type CreateSessionFormData = z.infer<typeof createSessionSchema>;
export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;
