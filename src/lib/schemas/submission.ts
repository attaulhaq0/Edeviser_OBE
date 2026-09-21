import { z } from "zod";

// Bucket-relative object keys, not public or expiring signed URLs. Allow
// existing nested keys on reads; new uploads use <auth.uid()>/<uuid>-<safeName>.
export const submissionStoragePathSchema = z.string().refine((path) => {
  const [owner, ...segments] = path.split("/");
  return (
    z.uuid().safeParse(owner).success &&
    segments.length > 0 &&
    segments.every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment)) &&
    !path.includes("..")
  );
}, "Invalid submission storage path");

export const submissionSchema = z
  .object({
    assignment_id: z.uuid(),
    student_id: z.uuid(),
    file_url: submissionStoragePathSchema,
    is_late: z.boolean().default(false),
  })
  .refine(
    (submission) => submission.file_url.split("/")[0] === submission.student_id,
    {
      message: "Submission file must belong to the authenticated student",
      path: ["file_url"],
    }
  );

// File-submission INSERT receipt from the server authority trigger. Never infer
// these fields from the browser clock or substitute the outbound form payload.
export const submissionReceiptSchema = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  student_id: z.uuid(),
  file_url: submissionStoragePathSchema,
  submitted_at: z.iso.datetime({ offset: true }),
  is_late: z.boolean(),
  status: z.literal("submitted"),
});

export type SubmissionFormData = z.infer<typeof submissionSchema>;
