import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

interface AvatarUploadConfig {
  file: File;
}

interface UseAvatarUploadReturn {
  uploadAvatar: (config: AvatarUploadConfig) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  isPending: boolean;
  error: Error | null;
}

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

const resizeImage = async (file: File): Promise<File> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageCompression = (await import("browser-image-compression" as any))
      .default;

    const options = {
      maxSizeMB: 0.15,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    };

    return await imageCompression(file, options);
  } catch {
    return file;
  }
};

export const useAvatarUpload = (): UseAvatarUploadReturn => {
  const { user, refetchProfile } = useAuth();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (config: AvatarUploadConfig) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { file } = config;

      const validation = validateAvatarFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const resizedFile = await resizeImage(file);
      const path = `${user.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, resizedFile, {
          cacheControl: "public, max-age=31536000, immutable",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    },
    onSuccess: async () => {
      await refetchProfile?.();
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("Avatar updated successfully");
    },
    onError: (error: Error) => {
      console.error("Avatar upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      await refetchProfile?.();
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("Avatar removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove avatar");
    },
  });

  const uploadAvatar = useCallback(
    async (config: AvatarUploadConfig) => {
      return uploadMutation.mutateAsync(config);
    },
    [uploadMutation]
  );

  const deleteAvatar = useCallback(async () => {
    return deleteMutation.mutateAsync();
  }, [deleteMutation]);

  return {
    uploadAvatar,
    deleteAvatar,
    isPending: uploadMutation.isPending || deleteMutation.isPending,
    error: uploadMutation.error || deleteMutation.error,
  };
};
