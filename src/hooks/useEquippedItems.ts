import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface EquippedItem {
  id: string;
  student_id: string;
  purchase_id: string;
  slot: 'profile_theme' | 'avatar_frame' | 'display_title';
  equipped_at: string;
}

export const useEquippedItems = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.equipped(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_equipped_items')
        .select('*')
        .eq('student_id', studentId);

      if (error) throw error;
      return (data ?? []) as EquippedItem[];
    },
    enabled: !!studentId,
  });
};

export const useEquipItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, purchaseId, slot }: { studentId: string; purchaseId: string; slot: string }) => {
      const { data, error } = await supabase
        .from('student_equipped_items')
        .upsert({ student_id: studentId, purchase_id: purchaseId, slot, equipped_at: new Date().toISOString() }, { onConflict: 'student_id,slot' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};

export const useUnequipItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, slot }: { studentId: string; slot: string }) => {
      const { error } = await supabase
        .from('student_equipped_items')
        .delete()
        .eq('student_id', studentId)
        .eq('slot', slot);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
