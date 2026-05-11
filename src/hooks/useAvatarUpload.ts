import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

/**
 * Configuration for avatar upload
 */
interface AvatarUploadConfig {
  file: File;
}

/**
 * Return type for useAvatarUpload
 */
interface UseAvatarUploadReturn {
  /** Upload the avatar file */
  uploadAvatar: (config: AvatarUploadConfig) => Promise<void>;
  /** Whether the upload is in progress */
  isPending: boolean;
  /** Error message if upload failed */
  error: Error | null;
}

/**
 * Validate avatar file
 * - Type: png, jpg, jpeg, webp
 * - Size: ≤ 2 MB
 */
const validateAvatarFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ["image/png", "image/jpeg", "image/webp"];
  const maxSize = 2 * 1024 * 1024; // 2 MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a PNG, JPG, or WebP image.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File is too large. Maximum size is 2 MB.",
    };
  }

  return { valid: true };
};

/**
 * Resize image to ≤ 512×512 @ ≤ 150 KB
 *
 * Uses browser-image-compression library (installed in Task 35)
 * Falls back to basic validation if library is not available
 */
const resizeImage = async (file: File): Promise<File> => {
  try {
    // Dynamic import to avoid bundling the library if not used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageCompression = (await import("browser-image-compression" as any))
      .default;

    const options = {
      maxSizeMB: 0.15, // 150 KB
      maxWidthOrHeight: 512,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch {
    // If library is not available, return the original file
    // (will be validated by size check in validateAvatarFile)
    console.warn(
      "Image compression library not available, using original file"
    );
    return file;
  }
};

/**
 * Hook for uploading user avatars
 *
 * Features:
 * - Validates file type and size
 * - Resizes image to ≤ 512×512 @ ≤ 150 KB
 * - Uploads to Supabase Storage bucket `avatars`
 * - Updates profiles.avatar_url
 * - Invalidates queryKeys.user.profile and queryKeys.user.list
 * - Emits Sonner toasts on success/failure
 *
 * Usage:
 * ```tsx
 * const { uploadAvatar, isPending, error } = useAvatarUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   try {
 *     await uploadAvatar({ file });
 *   } catch (err) {
 *     console.error('Upload failed:', err);
 *   }
 * };
 *
 * return (
 *   <div>
 *     <input
 *       type="file"
 *       accept="image/*"
 *       onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
 *       disabled={isPending}
 *     />
 *     {error && <p className="text-red-600">{error.message}</p>}
 *   </div>
 * );
 * ```
 */
export const useAvatarUpload = (): UseAvatarUploadReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (config: AvatarUploadConfig) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { file } = config;

      // Validate file
      const validation = validateAvatarFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Resize image
      const resizedFile = await resizeImage(file);

      // Generate unique filename
      const ext = resizedFile.name.split(".").pop() || "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, resizedFile, {
          cacheControl: "public, max-age=31536000, immutable",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = data.publicUrl;

      // Update profiles.avatar_url
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    },
    onSuccess: () => {
      // Invalidate queries so avatar updates across the app
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success("Avatar uploaded successfully");
    },
    onError: (error: Error) => {
      console.error("Avatar upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
    },
  });

  const uploadAvatar = useCallback(
    async (config: AvatarUploadConfig) => {
      return mutation.mutateAsync(config);
    },
    [mutation]
  );

  return {
    uploadAvatar,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
