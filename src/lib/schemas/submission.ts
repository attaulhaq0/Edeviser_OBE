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

export type SubmissionFormData = z.infer<typeof submissionSchema>;
