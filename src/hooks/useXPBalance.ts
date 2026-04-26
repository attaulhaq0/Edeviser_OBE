import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export const useXPBalance = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.balance(studentId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_xp_balance', {
        p_student_id: studentId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!studentId,
  });
};
