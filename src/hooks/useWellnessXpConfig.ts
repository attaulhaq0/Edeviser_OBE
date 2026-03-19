import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export const useWellnessXpConfig = () => {
  return useQuery({
    queryKey: [...queryKeys.institutionSettings.all, 'wellnessXp'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await db
        .from('institution_settings')
        .select('wellness_xp_amount')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data?.wellness_xp_amount as number) ?? 5;
    },
  });
};

export const useUpdateWellnessXpAmount = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (wellnessXpAmount: number) => {
      const { data: existing, error: fetchError } = await db
        .from('institution_settings')
        .select('id, wellness_xp_amount')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Institution settings not found');

      const previousValue = existing.wellness_xp_amount == null
        ? null
        : Number(existing.wellness_xp_amount);

      const { error: updateError } = await db
        .from('institution_settings')
        .update({ wellness_xp_amount: wellnessXpAmount })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      try {
        await logAuditEvent({
          action: 'update',
          entity_type: 'institution_settings',
          entity_id: existing.id as string,
          changes: {
            wellness_xp_amount: { from: previousValue, to: wellnessXpAmount },
          },
          performed_by: user?.id ?? 'unknown',
        });
      } catch (auditError) {
        console.error('Audit logging failed (update succeeded):', auditError);
      }

      return { wellnessXpAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutionSettings.all });
      toast.success('Wellness XP configuration updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update wellness XP configuration');
    },
  });
};
