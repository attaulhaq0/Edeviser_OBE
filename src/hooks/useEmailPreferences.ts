import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import type { EmailPreferencesFormData } from "@/lib/schemas/emailPrefs";

const DEFAULT_PREFERENCES: EmailPreferencesFormData = {
  streak_risk: true,
  weekly_summary: true,
  new_assignment: true,
  grade_released: true,
  notification_digest: false,
};

export const useEmailPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.emailPreferences.detail(user?.id ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("email_preferences" as never)
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const raw = (data as Record<string, unknown> | null)
        ?.email_preferences as Partial<EmailPreferencesFormData> | null;
      return { ...DEFAULT_PREFERENCES, ...raw };
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: EmailPreferencesFormData) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ email_preferences: prefs } as never)
        .eq("id", user.id);

      if (error) throw error;
      return prefs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailPreferences.detail(user?.id ?? ""),
      });
    },
  });

  // E1.8: per-key optimistic toggle. Only the clicked switch is pending —
  // toggling one preference must never disable/flash the others.
  const singlePreferenceMutation = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof EmailPreferencesFormData;
      value: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const current =
        queryClient.getQueryData<EmailPreferencesFormData>(
          queryKeys.emailPreferences.detail(user.id)
        ) ?? DEFAULT_PREFERENCES;
      const next = { ...current, [key]: value };

      const { error } = await supabase
        .from("profiles")
        .update({ email_preferences: next } as never)
        .eq("id", user.id);

      if (error) throw error;
      return next;
    },
    onMutate: ({ key, value }) => {
      const detailKey = queryKeys.emailPreferences.detail(user?.id ?? "");
      const previous =
        queryClient.getQueryData<EmailPreferencesFormData>(detailKey);
      // Optimistic: the switch flips instantly, so no global pending flash.
      queryClient.setQueryData<EmailPreferencesFormData>(
        detailKey,
        (old) => ({ ...(old ?? DEFAULT_PREFERENCES), [key]: value })
      );
      return { previous, detailKey };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.detailKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailPreferences.detail(user?.id ?? ""),
      });
    },
  });

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES,
    isLoading: query.isLoading,
    isError: query.isError,
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    /** Per-key toggle with optimistic update (E1.8). */
    updateSinglePreference: singlePreferenceMutation.mutate,
    isKeyPending: (key: keyof EmailPreferencesFormData): boolean =>
      singlePreferenceMutation.isPending &&
      singlePreferenceMutation.variables?.key === key,
  };
};
