import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  type AccessibilityPreferences,
  loadAccessibilityPreferences,
  saveAccessibilityPreferencesLocal,
  applyAccessibilityPreferences,
  accessibilityPreferencesSchema,
} from "@/lib/accessibilityPreferences";

const ACCESSIBILITY_KEY = ["accessibility", "preferences"] as const;

export const useAccessibilityPreferences = () => {
  return useQuery({
    queryKey: ACCESSIBILITY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return loadAccessibilityPreferences();

      const { data, error } = await supabase
        .from("profiles")
        .select("accessibility_preferences")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      const prefs = data?.accessibility_preferences;
      if (prefs) {
        const parsed = accessibilityPreferencesSchema.safeParse(prefs);
        if (parsed.success) return parsed.data;
      }
      return loadAccessibilityPreferences();
    },
    initialData: loadAccessibilityPreferences,
  });
};

export const useUpdateAccessibilityPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: AccessibilityPreferences) => {
      saveAccessibilityPreferencesLocal(prefs);
      applyAccessibilityPreferences(prefs);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return prefs;

      const { error } = await supabase
        .from("profiles")
        .update({ accessibility_preferences: prefs })
        .eq("id", user.id);
      if (error) throw error;
      return prefs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCESSIBILITY_KEY });
    },
  });
};
