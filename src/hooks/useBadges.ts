import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface StudentBadge {
  badge_key: string;
  badge_name: string;
  emoji: string;
  awarded_at: string;
}

export const useStudentBadges = () => {
  return useQuery({
    queryKey: queryKeys.badges.list({}),
    queryFn: async (): Promise<StudentBadge[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('badges')
        .select('badge_key, badge_name, emoji, awarded_at')
        .eq('student_id', user.id)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentBadge[];
    },
  });
};
