import { z } from "zod";

/**
 * Avatar upload validation schema
 *
 * Validates:
 * - File type: png, jpg, jpeg, webp
 * - File size: ≤ 2 MB
 */
export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => {
        const validTypes = ["image/png", "image/jpeg", "image/webp"];
        return validTypes.includes(file.type);
      },
      {
        message: "Invalid file type. Please upload a PNG, JPG, or WebP image.",
      }
    )
    .refine(
      (file) => {
        const maxSize = 2 * 1024 * 1024; // 2 MB
        return file.size <= maxSize;
      },
      {
        message: "File is too large. Maximum size is 2 MB.",
      }
    ),
});

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
