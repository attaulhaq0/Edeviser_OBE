import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ActiveBoost {
  id: string;
  boost_type: string;
  multiplier: number;
  activated_at: string;
  expires_at: string;
}

export const useActiveBoosts = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.boosts(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_active_boosts')
        .select('id, boost_type, multiplier, activated_at, expires_at')
        .eq('student_id', studentId)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ActiveBoost[];
    },
    enabled: !!studentId,
    refetchInterval: 30000,
  });
};
