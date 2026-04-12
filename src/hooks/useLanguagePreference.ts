import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

export const useUpdateLanguagePreference = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (language: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language } as Record<string, unknown>)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.i18n.languagePreference(user.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      }
    },
  });
};
